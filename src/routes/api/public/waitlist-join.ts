import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail, getServerSupabase } from '@/lib/email/send.server'

const Schema = z.object({
  email: z.string().email().max(255),
  source: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  marketing_opt_in: z.boolean().optional(),
})

export const Route = createFileRoute('/api/public/waitlist-join')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const parsed = Schema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'Invalid input' }, { status: 400 })
        }
        const { email, source = 'homepage-waitlist', marketing_opt_in = true } = parsed.data

        const supabase = getServerSupabase()
        const { error } = await supabase.from('mailing_list_subscribers').insert({
          email,
          source,
          marketing_opt_in,
        })

        if (error) {
          // Unique violation = already subscribed; treat as success but skip email
          const isDuplicate = (error as any).code === '23505'
          if (!isDuplicate) {
            console.error('Failed to insert subscriber', { error })
            return Response.json({ error: 'Failed to join waitlist' }, { status: 500 })
          }
          return Response.json({ success: true, alreadySubscribed: true })
        }

        // Fire confirmation email — non-fatal if it fails
        try {
          await enqueueTransactionalEmail({
            templateName: 'waitlist-confirmation',
            recipientEmail: email,
            templateData: { email },
            idempotencyKey: `waitlist-${email.toLowerCase()}`,
          })
        } catch (e) {
          console.error('Waitlist confirmation enqueue failed', { error: e })
        }

        return Response.json({ success: true })
      },
    },
  },
})
