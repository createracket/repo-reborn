import { createFileRoute } from '@tanstack/react-router'

// Max ~5MB upload (2 min of compressed voice audio fits comfortably).
const MAX_BYTES = 5 * 1024 * 1024

export const Route = createFileRoute('/api/public/transcribe-voice-note')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY
        if (!apiKey) {
          return Response.json({ error: 'AI not configured' }, { status: 500 })
        }

        // Signed-in only: transcription costs tokens, so it is metered per user.
        const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
        if (!token) {
          return Response.json({ error: 'Sign in to use voice notes.' }, { status: 401 })
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
        const userId = userData?.user?.id
        if (userErr || !userId) {
          return Response.json({ error: 'Sign in to use voice notes.' }, { status: 401 })
        }

        const { assertQuota, consumeQuota, QuotaError } = await import('@/lib/usage.server')
        try {
          await assertQuota(userId, 'voice_note')
        } catch (e) {
          if (e instanceof QuotaError) {
            return Response.json({ error: e.message }, { status: 429 })
          }
          throw e
        }


        const contentType = request.headers.get('content-type') || ''
        if (!contentType.includes('multipart/form-data')) {
          return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 })
        }

        let form: FormData
        try {
          form = await request.formData()
        } catch {
          return Response.json({ error: 'Invalid form data' }, { status: 400 })
        }

        const file = form.get('file')
        if (!(file instanceof File) || file.size === 0) {
          return Response.json({ error: 'No audio file provided' }, { status: 400 })
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: 'Recording too large (max 5MB)' }, { status: 413 })
        }

        const upstream = new FormData()
        // Name the part per the file's real container so the model can decode it.
        const mime = (file.type || '').split(';')[0]
        const extFromMime: Record<string, string> =
          { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg' }
        const ext = extFromMime[mime] ?? 'webm'
        upstream.append('file', file, `voice-note.${ext}`)
        upstream.append('model', 'openai/gpt-4o-mini-transcribe')

        const res = await fetch(
          'https://ai.gateway.lovable.dev/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstream,
          },
        )

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          console.error('Transcription failed', { status: res.status, body: body.slice(0, 500) })
          if (res.status === 429) {
            return Response.json({ error: 'Too many requests — try again shortly.' }, { status: 429 })
          }
          if (res.status === 402) {
            return Response.json({ error: 'Transcription temporarily unavailable.' }, { status: 402 })
          }
          return Response.json({ error: 'Transcription failed' }, { status: 502 })
        }

        const json = (await res.json()) as { text?: string }
        return Response.json({ text: json.text ?? '' })
      },
    },
  },
})
