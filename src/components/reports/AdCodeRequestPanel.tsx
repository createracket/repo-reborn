import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Copy, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { createAdCodeRequest, reviewAdCodeRequest, getAdCodeScreenshotUrls } from '@/lib/post-ad-code.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type Request = { id: string; token: string; status: string; email: string | null; code: string | null; permission_confirmed: boolean; expires_on: string | null; note: string | null; screenshot_paths: string[]; created_at: string }

export function AdCodeRequestPanel({ postId, creatorId, creatorName, platform, postUrl, postedAt }: { postId: string; creatorId: string; creatorName: string; platform: string; postUrl: string | null; postedAt: string | null }) {
  const create = useServerFn(createAdCodeRequest)
  const markReviewed = useServerFn(reviewAdCodeRequest)
  const getShots = useServerFn(getAdCodeScreenshotUrls)
  const [latest, setLatest] = useState<Request | null>(null)
  const [open, setOpen] = useState(false)
  const [review, setReview] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [shotUrls, setShotUrls] = useState<string[]>([])
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('post_ad_code_requests').select('id, token, status, email, code, permission_confirmed, expires_on, note, screenshot_paths, created_at').eq('post_id', postId).order('created_at', { ascending: false }).limit(1)
    setLatest((data?.[0] as Request | undefined) ?? null)
  }, [postId])
  useEffect(() => { void refresh() }, [refresh])
  if (!['instagram', 'tiktok'].includes(platform) || !postUrl || !postedAt || new Date(postedAt) > new Date()) return null
  async function openDraft() {
    const { data } = await supabase.from('post_ad_code_requests').select('email').eq('creator_id', creatorId).not('email', 'is', null).order('created_at', { ascending: false }).limit(1)
    setEmail(latest?.email ?? data?.[0]?.email ?? '')
    setMessage(`Hi ${creatorName}, thanks for sharing your ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} post! Now that it's live, could you ${platform === 'tiktok' ? 'send us a Spark Ads authorisation code for this video' : 'share a partnership-ad code or confirm content-level permission for this post'}? Please use the secure link below. Reply to community@createracket.com if you have questions.`)
    setOpen(true)
  }
  async function go(send: boolean) {
    setBusy(true)
    try {
      const result = await create({ data: { postId, email, message, send } })
      await navigator.clipboard.writeText(result.formUrl)
      toast.success(send ? result.emailStatus === 'sent' ? 'Request sent and copied to community@; link copied' : 'Email not sent; link copied' : 'Link copied')
      setOpen(false)
      await refresh()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  async function copyLink() {
    if (!latest) return
    try { await navigator.clipboard.writeText(`https://createracket.com/ad-code/${latest.token}`); toast.success('Creator link copied') } catch { toast.error('Could not copy link') }
  }
  async function copyCode() {
    if (!latest?.code) return
    try { await navigator.clipboard.writeText(latest.code); toast.success('Code copied') } catch { toast.error('Could not copy code') }
  }
  async function mark() {
    if (!latest) return
    setBusy(true)
    try { await markReviewed({ data: { requestId: latest.id } }); await refresh(); setReview(false); toast.success('Response marked reviewed') } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  async function openReview() {
    setReview(true)
    setShotUrls([])
    if (latest?.screenshot_paths.length) {
      try { setShotUrls((await getShots({ data: { requestId: latest.id } })).urls) } catch { toast.error('Could not load screenshots') }
    }
  }
  return <div className="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="outline" onClick={openDraft}><Mail className="mr-2 size-4" />Request ad codes</Button>
    {latest && <>
      <span className="text-xs text-muted-foreground">Ad code: {latest.status}</span>
      <Button size="sm" variant="ghost" onClick={copyLink} title="Copy creator link"><Copy className="size-4" /><span className="sr-only">Copy creator link</span></Button>
      {['submitted', 'reviewed'].includes(latest.status) && <Button size="sm" variant="outline" onClick={openReview}>Review response</Button>}
    </>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Request ad codes</DialogTitle><DialogDescription>A separate request for this live post. A private copy goes to community@createracket.com.</DialogDescription></DialogHeader>
      <div className="space-y-3"><div><Label htmlFor="ad-email">Creator email</Label><Input id="ad-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="creator@example.com" /></div><div><Label htmlFor="ad-message">Email draft</Label><Textarea id="ad-message" value={message} maxLength={3000} onChange={e => setMessage(e.target.value)} rows={7} /></div><p className="text-xs text-muted-foreground break-all">Post: {postUrl}</p></div>
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => go(false)}><Copy className="mr-2 size-4" />Copy link only</Button><Button disabled={busy || !email} onClick={() => go(true)}><Mail className="mr-2 size-4" />Send request</Button></div>
    </DialogContent></Dialog>
    <Dialog open={review} onOpenChange={setReview}><DialogContent><DialogHeader><DialogTitle>Ad-code response</DialogTitle><DialogDescription>This permission applies only to this post. Check the platform and expiry before use.</DialogDescription></DialogHeader>
      {latest && <div className="space-y-4 text-sm"><p><strong>Status:</strong> {latest.status}</p><p><strong>Creator:</strong> {latest.email || 'Link only'}</p><p><strong>Code:</strong> {latest.code ? <Button variant="outline" size="sm" onClick={copyCode}><Copy className="mr-2 size-4" />Copy code</Button> : 'Not provided'}</p><p><strong>Content-level permission:</strong> {latest.permission_confirmed ? 'Confirmed by creator' : 'Not confirmed'}</p><p><strong>Expires:</strong> {latest.expires_on || 'Not provided — confirm with creator'}</p><p className="whitespace-pre-wrap"><strong>Note:</strong> {latest.note || 'None'}</p>{shotUrls.length > 0 && <div className="flex gap-2">{shotUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" aria-label="Open screenshot"><img src={url} alt="Creator screenshot" className="h-28 w-28 rounded-sm object-cover" /></a>)}</div>}{latest.status === 'submitted' && <Button disabled={busy} onClick={mark}><ShieldCheck className="mr-2 size-4" />Mark reviewed</Button>}</div>}
    </DialogContent></Dialog>
  </div>
}
