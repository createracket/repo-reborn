import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<SuppressionReason, string> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<SuppressionReason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

function getSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

/**
 * Records the outcome in the app's own history tables. Notification only —
 * Lovable enforces suppression at send time; these rows are a convenience view.
 */
async function recordOutcome(
  reason: SuppressionReason,
  event: { event_id: string; data: { recipient: string; message_id?: string | null } },
) {
  const supabase = getSupabase()
  const normalizedEmail = event.data.recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: normalizedEmail, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: event.event_id,
    })
    throw new Error('Failed to write suppression')
  }

  const { error: insertError } = await supabase.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (insertError) {
    // Non-fatal — the suppression record was already written.
    console.warn('Failed to insert email_send_log', {
      code: insertError.code,
      message: insertError.message,
      event_id: event.event_id,
    })
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordOutcome('bounce', event as any)
            },
            'email.complaint': async (event) => {
              await recordOutcome('complaint', event as any)
            },
            'email.unsubscribed': async (event) => {
              await recordOutcome('unsubscribe', event as any)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
