import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveRenderedEmail, TEMPLATES } from '@/lib/email-templates/registry'
import { fetchCustomTemplateByName } from '@/lib/email-templates/custom-store.server'

const SITE_NAME = 'Racket'
const SENDER_DOMAIN = 'tech.createracket.com'
const FROM_DOMAIN = 'createracket.com'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
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

/** Internal sender — call from public action routes after validating input. */
export async function enqueueTransactionalEmail(
  opts: SendOptions,
): Promise<SendResult> {
  const { templateName, templateData = {} } = opts
  const builtin = TEMPLATES[templateName]
  // Custom templates (DB-stored) are also supported; check both.
  if (!builtin) {
    const custom = await fetchCustomTemplateByName(templateName)
    if (!custom) {
      return { success: false, error: `Template '${templateName}' not found`, status: 404 }
    }
  }

  // Built-in `to` overrides caller; custom templates always use caller recipient.
  const effectiveRecipient = builtin?.to || opts.recipientEmail
  if (!effectiveRecipient) {
    return { success: false, error: 'recipientEmail is required', status: 400 }
  }

  const supabase = getServerSupabase()
  const messageId = crypto.randomUUID()
  const idempotencyKey = opts.idempotencyKey || messageId
  const normalizedEmail = effectiveRecipient.toLowerCase()

  // Suppression check (fail-closed)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed', {
      error: suppressionError,
      recipient_redacted: redactEmail(effectiveRecipient),
    })
    return { success: false, error: 'Failed to verify suppression status', status: 500 }
  }

  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })
    return { success: false, reason: 'email_suppressed' }
  }

  // Get or create unsubscribe token
  let unsubscribeToken: string
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', { error: tokenLookupError })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return { success: false, error: 'Failed to prepare email', status: 500 }
  }

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    if (tokenError) {
      console.error('Failed to create unsubscribe token', { error: tokenError })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return { success: false, error: 'Failed to prepare email', status: 500 }
    }
    const { data: storedToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    unsubscribeToken = storedToken?.token ?? unsubscribeToken
  } else {
    // Token used but not suppressed — treat as suppressed.
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message: 'Unsubscribe token already used',
    })
    return { success: false, reason: 'email_suppressed' }
  }

  // Render — resolver handles built-ins, custom DB templates, and built-in overrides.
  const rendered = await resolveRenderedEmail(templateName, templateData)
  if (!rendered) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Template missing at render time',
    })
    return { success: false, error: 'Template not found', status: 404 }
  }
  const { subject: resolvedSubject, html, text: plainText } = rendered

  // Log pending then enqueue
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue email', { error: enqueueError })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { success: false, error: 'Failed to enqueue email', status: 500 }
  }

  console.log('Transactional email enqueued', {
    templateName,
    recipient_redacted: redactEmail(effectiveRecipient),
  })

  return { success: true, queued: true, messageId }
}
