import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const tokenSchema = z.string().regex(/^[a-f0-9]{40}$/)

async function db() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (!data) throw new Error('Only admins can manage creator connections.')
}

/** Admin: create (or reuse) a creator's connect link. */
export const createCreatorConnectLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ creatorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const admin = await db()
    const { data: existing } = await admin.from('creator_connect_links').select('token').eq('creator_id', data.creatorId).order('created_at', { ascending: false }).limit(1)
    let token = existing?.[0]?.token as string | undefined
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('')
      const { error } = await admin.from('creator_connect_links').insert({ token, creator_id: data.creatorId, created_by: context.userId })
      if (error) throw new Error('Could not create the connect link.')
    }
    return { url: `https://createracket.com/creator-connect/${token}` }
  })

/** Public (token): what the creator sees on their connect page. */
export const getCreatorConnectPublic = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const admin = await db()
    const { data: link } = await admin.from('creator_connect_links').select('id, creator_id, viewed_at, campaign_report_creators(name, campaign_reports(title))').eq('token', data.token).maybeSingle()
    if (!link) return { found: false as const }
    if (!link.viewed_at) await admin.from('creator_connect_links').update({ viewed_at: new Date().toISOString() }).eq('id', link.id)
    const { data: conns } = await admin.from('creator_social_connections').select('platform, username').eq('creator_id', link.creator_id)
    const { oauthConfigured } = await import('./creator-connect.server')
    const c = link.campaign_report_creators as any
    return {
      found: true as const,
      creatorName: c?.name as string | undefined,
      campaignTitle: c?.campaign_reports?.title as string | undefined,
      connected: (conns ?? []).map(r => ({ platform: r.platform as 'instagram' | 'tiktok', username: r.username })),
      available: { instagram: oauthConfigured('instagram'), tiktok: oauthConfigured('tiktok') },
    }
  })

/** Public (token): start OAuth — returns the provider URL to send the creator to. */
export const startCreatorConnect = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ token: tokenSchema, platform: z.enum(['instagram', 'tiktok']) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await db()
    const { data: link } = await admin.from('creator_connect_links').select('id').eq('token', data.token).maybeSingle()
    if (!link) throw new Error('This link is not valid.')
    const s = await import('./creator-connect.server')
    if (!s.oauthConfigured(data.platform)) throw new Error('This connection is not available yet.')
    return { url: s.authorizeUrl(data.platform, s.signState(data.token, data.platform)) }
  })

/** Admin: pull the latest numbers for one report post from the creator's connected account. */
export const syncPostFromCreatorAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const admin = await db()
    const { data: post } = await admin.from('campaign_report_posts').select('id, creator_id, platform, post_url').eq('id', data.postId).maybeSingle()
    if (!post?.post_url || !['instagram', 'tiktok'].includes(post.platform)) throw new Error('Save an Instagram or TikTok post link first.')
    const { data: conn } = await admin.from('creator_social_connections').select('id, platform, access_token_enc, refresh_token_enc, expires_at').eq('creator_id', post.creator_id).eq('platform', post.platform).maybeSingle()
    if (!conn) throw new Error(`This creator hasn't connected ${post.platform === 'tiktok' ? 'TikTok' : 'Instagram'} yet.`)
    const s = await import('./creator-connect.server')
    try {
      const token = await s.freshToken(admin, conn)
      const m = post.platform === 'instagram' ? await s.fetchInstagramPost(token, post.post_url) : await s.fetchTikTokPost(token, post.post_url)
      const update: Record<string, unknown> = { metrics_updated_at: new Date().toISOString() }
      for (const k of ['views', 'likes', 'comments', 'shares', 'saves', 'followers'] as const) if (typeof m[k] === 'number') update[k] = m[k]
      await admin.from('campaign_report_posts').update(update).eq('id', post.id)
      await admin.from('creator_social_connections').update({ last_sync_at: new Date().toISOString(), last_error: null }).eq('id', conn.id)
      return { metrics: m }
    } catch (e) {
      await admin.from('creator_social_connections').update({ last_error: (e as Error).message.slice(0, 300) }).eq('id', conn.id)
      throw e
    }
  })
