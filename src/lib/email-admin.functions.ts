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
    const { data: customs, error } = await context.supabase
      .from('email_custom_templates')
      .select('id, name, display_name, subject, sample_data')
      .order('display_name', { ascending: true })
    if (error) throw new Error(error.message)
    const customRows = customs ?? []
    const builtinNames = new Set(Object.keys(TEMPLATES))
    const overrideByName = new Map<string, { id: string; subject: string; display_name: string }>()
    for (const c of customRows) {
      if (builtinNames.has(c.name)) {
        overrideByName.set(c.name, { id: c.id as string, subject: c.subject, display_name: c.display_name })
      }
    }

    const builtins = Object.entries(TEMPLATES).map(([name, entry]) => {
      const override = overrideByName.get(name)
      return {
        name,
        displayName: override?.display_name ?? entry.displayName ?? name,
        subject: override?.subject ?? (typeof entry.subject === 'string' ? entry.subject : '(dynamic)'),
        hasPreviewData: !!entry.previewData,
        kind: 'builtin' as const,
        id: null as string | null,
        overrideId: override?.id ?? null,
        edited: !!override,
      }
    })
    const customOnly = customRows
      .filter((c: any) => !builtinNames.has(c.name))
      .map((c: any) => ({
        name: c.name,
        displayName: c.display_name,
        subject: c.subject,
        hasPreviewData: !!c.sample_data && Object.keys(c.sample_data).length > 0,
        kind: 'custom' as const,
        id: c.id as string,
        overrideId: null as string | null,
        edited: false,
      }))
    return { templates: [...customOnly, ...builtins] }
  })

const SendTestSchema = z.object({
  templateName: z.string().min(1).max(120),
  recipientEmail: z.string().email().max(255),
  sampleData: z.record(z.string(), z.any()).optional(),
})

export const sendTestEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendTestSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { enqueueTransactionalEmail } = await import('@/lib/email/send.server')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')

    let templateData: Record<string, any> = data.sampleData ?? {}
    const builtin = TEMPLATES[data.templateName]
    if (builtin) {
      if (!data.sampleData) templateData = builtin.previewData ?? {}
    } else {
      // Custom template — pull sample_data if caller didn't provide one
      if (!data.sampleData) {
        const { data: row, error } = await context.supabase
          .from('email_custom_templates')
          .select('sample_data')
          .eq('name', data.templateName)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!row) throw new Error('Template not found')
        templateData = (row.sample_data as Record<string, any>) ?? {}
      }
    }

    const result = await enqueueTransactionalEmail({
      templateName: data.templateName,
      recipientEmail: data.recipientEmail,
      templateData,
      idempotencyKey: `test-${data.templateName}-${Date.now()}`,
    })
    return result
  })

