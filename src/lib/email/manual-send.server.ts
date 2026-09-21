import { enqueueTransactionalEmail } from '@/lib/email/send.server'

export type ManualSendSummary = {
  queued: number
  skipped: number
  failures: { email: string; error: string }[]
}

/**
 * Send one template to a list of addresses, one message per recipient.
 * Shared by the admin "send now" action and the scheduled-send dispatcher.
 */
export async function runManualSend(opts: {
  templateName: string
  recipients: string[]
  templateData?: Record<string, any>
  idempotencyPrefix?: string
}): Promise<ManualSendSummary> {
  const unique = Array.from(new Set(opts.recipients.map((r) => r.toLowerCase())))
  const prefix = opts.idempotencyPrefix ?? `manual-${Date.now()}`
  let queued = 0
  let skipped = 0
  const failures: { email: string; error: string }[] = []

  for (const email of unique) {
    try {
      const res: any = await enqueueTransactionalEmail({
        templateName: opts.templateName,
        recipientEmail: email,
        templateData: { email, ...(opts.templateData ?? {}) },
        idempotencyKey: `${prefix}-${opts.templateName}-${email}`,
      })
      if (res?.success) queued++
      else if (res?.reason === 'email_suppressed') skipped++
      else failures.push({ email, error: res?.error ?? 'Unknown error' })
    } catch (e: any) {
      failures.push({ email, error: e?.message ?? 'Send failed' })
    }
  }

  return { queued, skipped, failures }
}

/** Process every scheduled send that is due. Called by the cron endpoint. */
export async function dispatchDueScheduledEmails(): Promise<{
  processed: number
  results: { id: string; queued: number; skipped: number; failed: number }[]
}> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { data: due, error } = await supabaseAdmin
    .from('scheduled_email_sends')
    .select('id, template_name, recipients, template_data, send_at')
    .eq('status', 'scheduled')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(20)
  if (error) throw new Error(error.message)

  const results: { id: string; queued: number; skipped: number; failed: number }[] = []

  for (const row of due ?? []) {
    // Claim the row so a concurrent run can't send it twice.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('scheduled_email_sends')
      .update({ status: 'processing' })
      .eq('id', row.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle()
    if (claimError || !claimed) continue

    try {
      const summary = await runManualSend({
        templateName: row.template_name as string,
        recipients: (row.recipients as string[]) ?? [],
        templateData: (row.template_data as Record<string, any>) ?? {},
        idempotencyPrefix: `scheduled-${row.id}`,
      })
      await supabaseAdmin
        .from('scheduled_email_sends')
        .update({
          status: summary.failures.length && summary.queued === 0 ? 'failed' : 'sent',
          result: summary as any,
          processed_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      results.push({
        id: row.id as string,
        queued: summary.queued,
        skipped: summary.skipped,
        failed: summary.failures.length,
      })
    } catch (e: any) {
      await supabaseAdmin
        .from('scheduled_email_sends')
        .update({
          status: 'failed',
          result: { error: e?.message ?? 'Dispatch failed' } as any,
          processed_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      results.push({ id: row.id as string, queued: 0, skipped: 0, failed: 1 })
    }
  }

  return { processed: results.length, results }
}
