import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { COMMUNITY_EMAIL } from './post-stats-fields'

const SITE = 'https://createracket.com'
const tokenSchema = z.string().regex(/^[a-f0-9]{40}$/)
const platformSchema = z.enum(['tiktok', 'instagram'])
const imageSchema = z.object({ type: z.enum(['image/jpeg', 'image/png', 'image/webp']), base64: z.string().max(14_000_000) })

async function db() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (!data) throw new Error('Only admins can manage ad-code requests.')
}

export const createAdCodeRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid(), email: z.string().trim().email().max(254).optional().or(z.literal('')), message: z.string().trim().max(3000), send: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    if (data.send && !data.email) throw new Error('Add the creator email before sending.')
    const admin = await db()
    const { data: post } = await admin.from('campaign_report_posts').select('id, post_url, posted_at, platform, creator_id, campaign_report_creators(name, report_id, campaign_reports(title))').eq('id', data.postId).maybeSingle()
    if (!post || !platformSchema.safeParse(post.platform).success || !post.post_url || !post.posted_at || new Date(post.posted_at) > new Date()) throw new Error('Save a live Instagram or TikTok post with a posting date first.')
    const creator = post.campaign_report_creators as any
    if (!creator?.report_id) throw new Error('Report not found.')
    const token = Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('')
    const { data: row, error } = await admin.from('post_ad_code_requests').insert({ token, report_id: creator.report_id, post_id: post.id, creator_id: post.creator_id, platform: post.platform, email: data.email || null, message: data.message || null, created_by: context.userId }).select('id').single()
    if (error || !row) throw new Error('Could not create the ad-code request.')
    const formUrl = `${SITE}/ad-code/${token}`
    let emailStatus: 'sent' | 'suppressed' | 'not_sent' = 'not_sent'
    if (data.send && data.email) {
      const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
      const templateData = { creatorName: creator.name, campaignTitle: creator.campaign_reports?.title, platform: post.platform, postUrl: post.post_url, formUrl, message: data.message }
      const result = await sendTemplateEmail('ad-code-request', data.email, { templateData, replyTo: COMMUNITY_EMAIL, idempotencyKey: `ad-code-request-${row.id}` })
      emailStatus = result.sent ? 'sent' : 'suppressed'
      if (result.sent) {
        await admin.from('post_ad_code_requests').update({ sent_at: new Date().toISOString() }).eq('id', row.id)
        try {
          await sendTemplateEmail('ad-code-request', COMMUNITY_EMAIL, { templateData: { ...templateData, copyNote: `Copy of the request sent to ${creator.name} (${data.email})` }, idempotencyKey: `ad-code-copy-${row.id}` })
        } catch (e) { console.error('ad code copy failed', e) }
      }
    }
    return { formUrl, emailStatus }
  })

export const getAdCodeRequestPublic = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const admin = await db()
    const { data: row } = await admin.from('post_ad_code_requests').select('id, status, platform, message, code, permission_confirmed, expires_on, note, viewed_at, post_id, screenshot_paths').eq('token', data.token).maybeSingle()
    if (!row) return { found: false as const }
    const { data: post } = await admin.from('campaign_report_posts').select('post_url, thumbnail_url, campaign_report_creators(name, campaign_reports(title))').eq('id', row.post_id).maybeSingle()
    if (!row.viewed_at) await admin.from('post_ad_code_requests').update({ viewed_at: new Date().toISOString(), status: row.status === 'requested' ? 'viewed' : row.status }).eq('id', row.id)
    const creator = post?.campaign_report_creators as any
    return { found: true as const, locked: row.status === 'reviewed', platform: row.platform, message: row.message, code: row.code, permissionConfirmed: row.permission_confirmed, expiresOn: row.expires_on, note: row.note, screenshotCount: row.screenshot_paths.length, postUrl: post?.post_url, thumbnailUrl: post?.thumbnail_url, creatorName: creator?.name, campaignTitle: creator?.campaign_reports?.title }
  })

export const submitAdCodeRequestPublic = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ token: tokenSchema, code: z.string().trim().max(500), permissionConfirmed: z.boolean(), expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')), note: z.string().trim().max(2000), images: z.array(imageSchema).max(3) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await db()
    const { data: row } = await admin.from('post_ad_code_requests').select('id, status, platform, report_id, post_id, screenshot_paths').eq('token', data.token).maybeSingle()
    if (!row || row.status === 'reviewed') throw new Error('This link is no longer open. Reply to the email for a new link.')
    if (row.platform === 'tiktok' && !data.code) throw new Error('Please enter your Spark Ads code.')
    if (row.platform === 'instagram' && !data.code && !data.permissionConfirmed) throw new Error('Enter a partnership ad code or confirm content-level permission.')
    if (data.expiresOn && data.expiresOn < new Date().toISOString().slice(0, 10)) throw new Error('Choose a future expiry date.')
    let paths = row.screenshot_paths
    if (data.images.length) {
      paths = []
      for (const [index, image] of data.images.entries()) {
        const bytes = Uint8Array.from(atob(image.base64), char => char.charCodeAt(0))
        if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Each screenshot must be under 10MB.')
        const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${row.id}/${crypto.randomUUID()}-${index}.${ext}`
        const { error: uploadError } = await admin.storage.from('ad-code-screenshots').upload(path, bytes, { contentType: image.type })
        if (uploadError) throw new Error('Could not upload the screenshot. Please try again.')
        paths.push(path)
      }
    }
    const first = row.status !== 'submitted'
    const { data: updated, error } = await admin.from('post_ad_code_requests').update({ code: data.code || null, permission_confirmed: data.permissionConfirmed, expires_on: data.expiresOn || null, note: data.note || null, screenshot_paths: paths, status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', row.id).neq('status', 'reviewed').select('id').maybeSingle()
    if (error || !updated) throw new Error('Could not save your response. Please try again.')
    if (first) {
      try {
        const { data: report } = await admin.from('campaign_reports').select('title').eq('id', row.report_id).maybeSingle()
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        await sendTemplateEmail('ad-code-submitted', COMMUNITY_EMAIL, { templateData: { campaignTitle: report?.title, platform: row.platform, builderUrl: `${SITE}/campaign-reports?edit=${row.report_id}` }, idempotencyKey: `ad-code-submitted-${row.id}` })
      } catch (e) { console.error('ad code submission notification failed', e) }
    }
    return { submitted: true }
  })

export const reviewAdCodeRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const admin = await db()
    const { data: reviewed, error } = await admin.from('post_ad_code_requests').update({ status: 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', data.requestId).eq('status', 'submitted').select('id').maybeSingle()
    if (error || !reviewed) throw new Error('Only a submitted response can be reviewed.')
    return { reviewed: true }
  })

export const getAdCodeScreenshotUrls = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const admin = await db()
    const { data: row } = await admin.from('post_ad_code_requests').select('screenshot_paths').eq('id', data.requestId).maybeSingle()
    if (!row) throw new Error('Request not found.')
    const urls: string[] = []
    for (const path of row.screenshot_paths) {
      const { data: signed, error } = await admin.storage.from('ad-code-screenshots').createSignedUrl(path, 300)
      if (!error && signed?.signedUrl) urls.push(signed.signedUrl)
    }
    return { urls }
  })
