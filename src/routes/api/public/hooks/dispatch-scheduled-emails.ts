import { createFileRoute } from '@tanstack/react-router'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const Route = createFileRoute('/api/public/hooks/dispatch-scheduled-emails')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-scheduled-email-secret') ?? ''
        const envSecret = process.env['SCHEDULED_EMAIL_SECRET'] ?? ''
        let authorized = !!provided && !!envSecret && safeEqual(provided, envSecret)

        if (!authorized && provided) {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          const { data: tokenRow } = await supabaseAdmin
            .from('scheduled_email_cron_token')
            .select('token')
            .maybeSingle()
          const dbToken = (tokenRow?.token as string | undefined) ?? ''
          authorized = !!dbToken && safeEqual(provided, dbToken)
        }

        if (!authorized) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const { dispatchDueScheduledEmails } = await import('@/lib/email/manual-send.server')
          const out = await dispatchDueScheduledEmails()
          return new Response(JSON.stringify({ success: true, ...out }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          console.error('Scheduled email dispatch failed', e)
          return new Response(
            JSON.stringify({ success: false, error: e?.message ?? 'Dispatch failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
