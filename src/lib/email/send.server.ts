import { EmailAPIError, sendLovableEmail } from '@lovable.dev/email-js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveRenderedEmail, TEMPLATES } from '@/lib/email-templates/registry'
import { fetchCustomTemplateByName } from '@/lib/email-templates/custom-store.server'

const SITE_NAME = 'Create Racket'
const SENDER_DOMAIN = 'tech.createracket.com'
const FROM_DOMAIN = 'createracket.com'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

export function getServerSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export type SendResult =
  | { success: true; queued: true; messageId: string }
  | { success: false; reason: 'email_suppressed' }
  | { success: false; error: string; status: number }

export interface SendOptions {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}

async function logSend(
  supabase: SupabaseClient,
  row: {
    message_id: string | null
    template_name: string
    recipient_email: string
    status: string
    error_message?: string
  },
) {
  const { error } = await supabase.from('email_send_log').insert(row)
  if (error) {
    console.error('Failed to write email_send_log', {
      code: error.code,
      message: error.message,
    })
  }
}

/**
 * Internal sender — call from server code after validating input.
 * Sends through Lovable's managed email API. Suppression, retries and rate
 * limits are enforced by Lovable; this function only records app-side history.
 * Templates may be built-in React Email components or admin-authored ones
 * stored in the database, so the HTML is composed here at send time.
 */
export async function enqueueTransactionalEmail(
  opts: SendOptions,
): Promise<SendResult> {
  const { templateName, templateData = {} } = opts

  // Built-in fixed recipient overrides the caller's address.
  const effectiveRecipient = TEMPLATES[templateName]?.to || opts.recipientEmail
  if (!effectiveRecipient) {
    return { success: false, error: 'recipientEmail is required', status: 400 }
  }


  const apiKey = process.env.LOVABLE_API_KEY
  if (!apiKey) {
    console.error('LOVABLE_API_KEY is not configured')
    return { success: false, error: 'Email sending is not configured', status: 500 }
  }

  const supabase = getServerSupabase()
  const messageId = crypto.randomUUID()
  const idempotencyKey = opts.idempotencyKey || messageId

  // Render — resolver handles built-ins, custom DB templates, and built-in overrides.
  const rendered = await resolveRenderedEmail(templateName, templateData)
  if (!rendered) {
    await logSend(supabase, {
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Template missing at render time',
    })
    return { success: false, error: 'Template not found', status: 404 }
  }
  const { subject: resolvedSubject, html, text: plainText } = rendered

  try {
    await sendLovableEmail(
      {
        to: effectiveRecipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: resolvedSubject,
        html,
        text: plainText,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
      },
      { apiKey, sendUrl: process.env.LOVABLE_SEND_URL },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logSend(supabase, {
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'suppressed',
      })
      return { success: false, reason: 'email_suppressed' }
    }
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Email send failed', {
      templateName,
      recipient_redacted: redactEmail(effectiveRecipient),
      error: errorMsg,
    })
    await logSend(supabase, {
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: errorMsg.slice(0, 1000),
    })
    return { success: false, error: 'Failed to send email', status: 500 }
  }

  await logSend(supabase, {
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'sent',
  })

  console.log('Transactional email sent', {
    templateName,
    recipient_redacted: redactEmail(effectiveRecipient),
  })

  return { success: true, queued: true, messageId }
}

export type EventSendResult = SendResult | { success: false; reason: 'event_disabled' }

/**
 * Send the template bound to a site action. No-ops when the action has no
 * template assigned or is switched off (the default for every action).
 */
export async function sendForEvent(
  eventKey: string,
  opts: { recipientEmail: string; templateData?: Record<string, any>; idempotencyKey?: string },
): Promise<EventSendResult> {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('email_event_bindings')
      .select('template_name, enabled')
      .eq('event_key', eventKey)
      .maybeSingle()

    if (error) {
      console.error('Email event binding lookup failed', { eventKey, error })
      return { success: false, reason: 'event_disabled' }
    }
    const binding = data as { template_name: string | null; enabled: boolean } | null
    if (!binding?.enabled || !binding.template_name) {
      return { success: false, reason: 'event_disabled' }
    }
    if (!opts.recipientEmail) return { success: false, reason: 'event_disabled' }

    return await enqueueTransactionalEmail({
      templateName: binding.template_name,
      recipientEmail: opts.recipientEmail,
      templateData: opts.templateData ?? {},
      idempotencyKey: opts.idempotencyKey,
    })
  } catch (e) {
    console.error('sendForEvent failed', { eventKey, error: e })
    return { success: false, reason: 'event_disabled' }
  }
}
