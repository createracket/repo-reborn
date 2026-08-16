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
    const overrideByName = new Map<string, { id: string; subject: string; display_name: string; sample_data: Record<string, any> | null }>()
    for (const c of customRows) {
      if (builtinNames.has(c.name)) {
        overrideByName.set(c.name, {
          id: c.id as string,
          subject: c.subject,
          display_name: c.display_name,
          sample_data: (c.sample_data as Record<string, any> | null) ?? null,
        })
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
        sampleData: override?.sample_data ?? entry.previewData ?? {},
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
        sampleData: (c.sample_data as Record<string, any>) ?? {},
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

/* -------------------------------------------------------------------------- */
/* Event bindings (template ↔ site action)                                    */
/* -------------------------------------------------------------------------- */

export const getEventBindings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin
      .from('email_event_bindings')
      .select('event_key, template_name, enabled, updated_at')
    if (error) throw new Error(error.message)
    return { bindings: data ?? [] }
  })

const BindingSchema = z.object({
  eventKey: z.string().min(1).max(80),
  templateName: z.string().min(1).max(120).nullable(),
  enabled: z.boolean(),
})

export const setEventBinding = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BindingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { EMAIL_EVENT_KEYS } = await import('@/lib/email/events')
    if (!EMAIL_EVENT_KEYS.includes(data.eventKey)) throw new Error('Unknown event')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await supabaseAdmin.from('email_event_bindings').upsert(
      {
        event_key: data.eventKey,
        template_name: data.templateName,
        enabled: data.templateName ? data.enabled : false,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_key' },
    )
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/* -------------------------------------------------------------------------- */
/* Manual sends                                                               */
/* -------------------------------------------------------------------------- */

export const listEmailRecipients = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name')
      .not('email', 'is', null)
      .order('display_name', { ascending: true })
      .limit(1000)
    if (error) throw new Error(error.message)
    return { users: (data ?? []) as { id: string; email: string; display_name: string | null }[] }
  })

const ManualSendSchema = z.object({
  templateName: z.string().min(1).max(120),
  recipients: z.array(z.string().email().max(255)).min(1).max(50),
  templateData: z.record(z.string(), z.any()).optional(),
})

export const sendTemplateToRecipients = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ManualSendSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { enqueueTransactionalEmail } = await import('@/lib/email/send.server')

    const unique = Array.from(new Set(data.recipients.map((r) => r.toLowerCase())))
    const stamp = Date.now()
    let queued = 0
    let skipped = 0
    const failures: { email: string; error: string }[] = []

    for (const email of unique) {
      try {
        const res: any = await enqueueTransactionalEmail({
          templateName: data.templateName,
          recipientEmail: email,
          templateData: { email, ...(data.templateData ?? {}) },
          idempotencyKey: `manual-${data.templateName}-${email}-${stamp}`,
        })
        if (res?.success) queued++
        else if (res?.reason === 'email_suppressed') skipped++
        else failures.push({ email, error: res?.error ?? 'Unknown error' })
      } catch (e: any) {
        failures.push({ email, error: e?.message ?? 'Send failed' })
      }
    }

    return { queued, skipped, failures }
  })

/* -------------------------------------------------------------------------- */
/* Event notify — called by admin UI flows (share actions)                    */
/* -------------------------------------------------------------------------- */

const NotifySchema = z.object({
  eventKey: z.string().min(1).max(80),
  recipientEmail: z.string().email().max(255),
  templateData: z.record(z.string(), z.any()).optional(),
})

export const notifyEmailEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NotifySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { EMAIL_EVENT_KEYS } = await import('@/lib/email/events')
    if (!EMAIL_EVENT_KEYS.includes(data.eventKey)) throw new Error('Unknown event')
    const { sendForEvent } = await import('@/lib/email/send.server')
    const res: any = await sendForEvent(data.eventKey, {
      recipientEmail: data.recipientEmail,
      templateData: data.templateData ?? {},
    })
    return { sent: !!res?.success, reason: res?.reason ?? null }
  })


