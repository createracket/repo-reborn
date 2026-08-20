import { createFileRoute } from '@tanstack/react-router'

// Brief attachments: one document per submission, kept small and locked down.
const MAX_BYTES = 8 * 1024 * 1024

type Sniffer = (b: Uint8Array) => boolean

const startsWith = (bytes: Uint8Array, sig: number[]) =>
  sig.every((byte, i) => bytes[i] === byte)

const isZip: Sniffer = (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) || startsWith(b, [0x50, 0x4b, 0x05, 0x06])
const isOle: Sniffer = (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0])
const isPdf: Sniffer = (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46])
const isJpg: Sniffer = (b) => startsWith(b, [0xff, 0xd8, 0xff])
const isPng: Sniffer = (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47])
const isWebp: Sniffer = (b) =>
  startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
// Plain text: no control bytes other than tab/newline/carriage return.
const isText: Sniffer = (b) => {
  for (let i = 0; i < Math.min(b.length, 4096); i++) {
    const c = b[i]!
    if (c === 0) return false
    if (c < 0x09 || (c > 0x0d && c < 0x20)) return false
  }
  return true
}

/** Extension -> { contentType, sniff }. Anything not listed here is refused. */
const ALLOWED: Record<string, { contentType: string; sniff: Sniffer }> = {
  pdf: { contentType: 'application/pdf', sniff: isPdf },
  doc: { contentType: 'application/msword', sniff: isOle },
  docx: {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sniff: isZip,
  },
  ppt: { contentType: 'application/vnd.ms-powerpoint', sniff: isOle },
  pptx: {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sniff: isZip,
  },
  xls: { contentType: 'application/vnd.ms-excel', sniff: isOle },
  xlsx: {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sniff: isZip,
  },
  txt: { contentType: 'text/plain', sniff: isText },
  jpg: { contentType: 'image/jpeg', sniff: isJpg },
  jpeg: { contentType: 'image/jpeg', sniff: isJpg },
  png: { contentType: 'image/png', sniff: isPng },
  webp: { contentType: 'image/webp', sniff: isWebp },
}

// Best-effort per-IP throttle (in-memory; resets with the worker instance).
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return false
}

export const Route = createFileRoute('/api/public/upload-brief-file')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get('cf-connecting-ip') ||
          (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
          'unknown'
        if (rateLimited(ip)) {
          return Response.json(
            { error: 'Too many uploads — please try again later.' },
            { status: 429 },
          )
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
          return Response.json({ error: 'No file provided' }, { status: 400 })
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: 'File too large (max 8MB)' }, { status: 413 })
        }

        const originalName = file.name.slice(0, 200)
        const ext = originalName.split('.').pop()?.toLowerCase() ?? ''
        const allowed = ALLOWED[ext]
        if (!allowed) {
          return Response.json(
            { error: 'Unsupported file type. Use PDF, Word, PowerPoint, Excel, text or an image.' },
            { status: 415 },
          )
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        if (bytes.byteLength > MAX_BYTES) {
          return Response.json({ error: 'File too large (max 8MB)' }, { status: 413 })
        }
        if (!allowed.sniff(bytes)) {
          return Response.json(
            { error: "That file's contents don't match its extension." },
            { status: 415 },
          )
        }

        const path = `briefs/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { error } = await supabaseAdmin.storage
          .from('brief-uploads')
          .upload(path, bytes, { contentType: allowed.contentType, upsert: false })

        if (error) {
          console.error('Brief upload failed', error.message)
          return Response.json({ error: 'Upload failed — please try again.' }, { status: 502 })
        }

        return Response.json({ path, name: originalName, size: bytes.byteLength })
      },
    },
  },
})
