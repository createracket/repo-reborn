import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAdCodeRequestPublic, submitAdCodeRequestPublic } from '@/lib/post-ad-code.functions'
import { resizeImageFile } from '@/lib/image-resize'

export const Route = createFileRoute('/ad-code/$token')({
  head: () => ({ meta: [
    { title: 'Share ad-code permission — Racket' },
    { name: 'description', content: 'Share ad-code permission for your campaign post with Racket.' },
    { property: 'og:title', content: 'Share ad-code permission — Racket' },
    { property: 'og:description', content: 'Respond securely to a post-specific ad-code request.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }), component: AdCodeForm,
})
type Loaded = Extract<Awaited<ReturnType<typeof getAdCodeRequestPublic>>, { found: true }>
function Shell({ children }: { children: ReactNode }) { return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-xl px-5 py-12 space-y-6">{children}</div></main> }
function AdCodeForm() {
  const { token } = Route.useParams()
  const load = useServerFn(getAdCodeRequestPublic)
  const submit = useServerFn(submitAdCodeRequestPublic)
  const [req, setReq] = useState<Loaded | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'open' | 'done' | 'locked'>('loading')
  const [code, setCode] = useState('')
  const [permission, setPermission] = useState(false)
  const [expires, setExpires] = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { load({ data: { token } }).then(r => {
    if (!r.found) { setState('missing'); return }
    setReq(r); setCode(r.code ?? ''); setPermission(r.permissionConfirmed); setExpires(r.expiresOn ?? ''); setNote(r.note ?? ''); setState(r.locked ? 'locked' : 'open')
  }).catch(() => setState('missing')) }, [token])
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const images: { type: 'image/jpeg'; base64: string }[] = []
      for (const file of files) {
        const resized = await resizeImageFile(file, 1800)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(resized)
        })
        images.push({ type: 'image/jpeg', base64 })
      }
      await submit({ data: { token, code, permissionConfirmed: permission, expiresOn: expires, note, images } }); setState('done')
    }
    catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
  }
  if (state === 'loading') return <Shell><p>Loading…</p></Shell>
  if (state === 'missing') return <Shell><h1 className="text-2xl font-bold">This link isn't valid</h1><p>Check the link in your email or reply to community@createracket.com for a new one.</p></Shell>
  if (state === 'locked') return <Shell><h1 className="text-2xl font-bold">Thank you</h1><p>This response has been reviewed. Reply to community@createracket.com if something needs updating.</p></Shell>
  if (state === 'done') return <Shell><h1 className="text-2xl font-bold">Thank you — response received</h1><p>We'll review it. You can reopen this link to correct your answer until it's reviewed.</p><Button onClick={() => setState('open')}>Edit my answer</Button></Shell>
  return <Shell><div><p className="text-sm text-muted-foreground">Racket · {req?.campaignTitle || 'Campaign'}</p><h1 className="text-3xl font-bold">Share ad-code permission</h1><p className="mt-2">{req?.creatorName ? `Hi ${req.creatorName}, ` : ''}please respond for this specific {req?.platform === 'tiktok' ? 'TikTok video' : 'Instagram post'} only.</p></div>
    {req?.thumbnailUrl && <img src={req.thumbnailUrl} alt="Post preview" className="max-h-64 max-w-full rounded-md object-contain" />}
    {req?.postUrl && <a href={req.postUrl} target="_blank" rel="noreferrer" className="break-all text-sm underline">View the post</a>}
    {req?.message && <p className="whitespace-pre-wrap border-l-2 border-pink-accent pl-4">{req.message}</p>}
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm">{req?.platform === 'tiktok' ? 'In TikTok, open your live video → ··· → Ad settings → Generate code. Choose an authorisation period and paste the Spark Ads code below.' : 'In Instagram, open the live post’s partnership ad settings to generate a content-level code, or enable “Allow brand partner to boost” for this post.'}</p>
      <div><Label htmlFor="ad-code">{req?.platform === 'tiktok' ? 'Spark Ads authorisation code' : 'Partnership-ad code (if provided)'}</Label><Input id="ad-code" value={code} onChange={e => setCode(e.target.value)} maxLength={500} autoComplete="off" /></div>
      {req?.platform === 'instagram' && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={permission} onChange={e => setPermission(e.target.checked)} className="mt-1" />I enabled content-level permission for the brand partner to boost this specific post.</label>}
      <div><Label htmlFor="expires">Code expiry (if known)</Label><Input id="expires" type="date" value={expires} onChange={e => setExpires(e.target.value)} min={new Date().toISOString().slice(0, 10)} /></div>
      <div><Label htmlFor="ad-note">Anything else? (optional)</Label><Textarea id="ad-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></div>
      <div><Label htmlFor="ad-shots">Screenshots (optional, up to 3 × 10MB)</Label><Input id="ad-shots" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => {
        const chosen = Array.from(e.target.files ?? [])
        if (chosen.length > 3 || chosen.some(f => f.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(f.type))) { toast.error('Choose up to 3 PNG, JPEG or WebP images under 10MB each.'); e.target.value = ''; return }
        setFiles(chosen)
      }} />{files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} selected</p>}</div>
      <p className="text-xs text-muted-foreground">Sharing a code or confirmation does not grant permission for other posts, platforms or uses.</p>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send response'}</Button>
    </form>
  </Shell>
}
