import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error || !data) throw new Error('Forbidden')
}

const FiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['sent', 'dlq', 'failed', 'suppressed', 'pending', 'bounced', 'complained']).optional(),
  template: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).max(10_000).default(0),
})

export type EmailLogRow = {
  message_id: string | null
  template_name: string
  recipient_email: string
  status: string
  error_message: string | null
  created_at: string
}

function dedupeLatestByMessageId<T extends { message_id: string | null; created_at: string }>(rows: T[]): T[] {
  const seen = new Map<string, T>()
  // Rows arrive ordered by created_at desc; keep first occurrence per message_id.
  for (const r of rows) {
    const key = r.message_id ?? `__null__${r.created_at}`
    if (!seen.has(key)) seen.set(key, r)
  }
  return Array.from(seen.values())
}

export const getEmailLogs = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    let q = supabaseAdmin
      .from('email_send_log')
      .select('message_id, template_name, recipient_email, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(data.limit * 4, 500)) // overfetch to allow dedup

    if (data.from) q = q.gte('created_at', data.from)
    if (data.to) q = q.lte('created_at', data.to)
    if (data.template) q = q.eq('template_name', data.template)

    const { data: rows, error } = await q
    if (error) throw new Error(error.message)

    let deduped = dedupeLatestByMessageId(rows ?? [])
    if (data.status) deduped = deduped.filter((r) => r.status === data.status)
    const total = deduped.length
    const page = deduped.slice(data.offset, data.offset + data.limit)
    return { rows: page as EmailLogRow[], total }
  })

const StatsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const getEmailStats = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    let q = supabaseAdmin
      .from('email_send_log')
      .select('message_id, status, created_at, template_name')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (data.from) q = q.gte('created_at', data.from)
    if (data.to) q = q.lte('created_at', data.to)

    const { data: rows, error } = await q
    if (error) throw new Error(error.message)

    const deduped = dedupeLatestByMessageId(rows ?? [])
    const stats = { total: deduped.length, sent: 0, failed: 0, suppressed: 0, pending: 0 }
    const templates = new Set<string>()
    for (const r of deduped) {
      templates.add(r.template_name)
      if (r.status === 'sent') stats.sent++
      else if (r.status === 'dlq' || r.status === 'failed' || r.status === 'bounced' || r.status === 'complained') stats.failed++
      else if (r.status === 'suppressed') stats.suppressed++
      else if (r.status === 'pending') stats.pending++
    }
    return { stats, templates: Array.from(templates).sort() }
  })

export const getSuppressedEmails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin
      .from('suppressed_emails')
      .select('email, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return { rows: data ?? [] }
  })

export const getEmailTemplates = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    return {
      templates: Object.entries(TEMPLATES).map(([name, entry]) => ({
        name,
        displayName: entry.displayName ?? name,
        subject: typeof entry.subject === 'string' ? entry.subject : '(dynamic)',
        hasPreviewData: !!entry.previewData,
      })),
    }
  })

const SendTestSchema = z.object({
  templateName: z.string().min(1).max(120),
  recipientEmail: z.string().email().max(255),
})

export const sendTestEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendTestSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { enqueueTransactionalEmail } = await import('@/lib/email/send.server')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const entry = TEMPLATES[data.templateName]
    if (!entry) throw new Error('Template not found')
    const result = await enqueueTransactionalEmail({
      templateName: data.templateName,
      recipientEmail: data.recipientEmail,
      templateData: entry.previewData ?? {},
      idempotencyKey: `test-${data.templateName}-${Date.now()}`,
    })
    return result
  })
