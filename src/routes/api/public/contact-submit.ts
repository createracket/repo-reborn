import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { enqueueTransactionalEmail, getServerSupabase } from '@/lib/email/send.server'
import { findProfanityIn } from '@/lib/profanity'

const Schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000),
})

export const Route = createFileRoute('/api/public/contact-submit')({
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
        const { name, email, message } = parsed.data

        if (findProfanityIn({ name, message })) {
          return Response.json(
            { error: 'Please remove offensive language before sending.' },
            { status: 400 },
          )
        }

        const supabase = getServerSupabase()
        const { error } = await supabase.from('contact_messages').insert({
          name,
          email,
          message,
        })

        if (error) {
          console.error('Failed to insert contact message', { error })
          return Response.json({ error: 'Failed to send message' }, { status: 500 })
        }

        try {
          await enqueueTransactionalEmail({
            templateName: 'contact-confirmation',
            recipientEmail: email,
            templateData: { name, message },
            idempotencyKey: `contact-${email.toLowerCase()}-${Date.now()}`,
          })
        } catch (e) {
          console.error('Contact confirmation enqueue failed', { error: e })
        }

        return Response.json({ success: true })
      },
    },
  },
})
