import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getCreatorConnectPublic, startCreatorConnect } from '@/lib/creator-connect.functions'

export const Route = createFileRoute('/creator-connect/$token')({
  head: () => ({ meta: [
    { title: 'Connect your accounts — Racket' },
    { name: 'description', content: 'Securely connect Instagram or TikTok so Racket can read your campaign post results.' },
    { property: 'og:title', content: 'Connect your accounts — Racket' },
    { property: 'og:description', content: 'Share your campaign post results with Racket in one click.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: CreatorConnect,
})

type Loaded = Extract<Awaited<ReturnType<typeof getCreatorConnectPublic>>, { found: true }>
const LABEL = { instagram: 'Instagram', tiktok: 'TikTok' } as const

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-xl space-y-6 px-5 py-12">{children}</div></main>
}

function CreatorConnect() {
  const { token } = Route.useParams()
  const load = useServerFn(getCreatorConnectPublic)
  const start = useServerFn(startCreatorConnect)
  const [info, setInfo] = useState<Loaded | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setStatus(new URLSearchParams(window.location.search).get('status'))
    load({ data: { token } }).then(r => (r.found ? setInfo(r) : setMissing(true))).catch(() => setMissing(true))
  }, [token])

  async function connect(platform: 'instagram' | 'tiktok') {
    setBusy(platform)
    try { window.location.href = (await start({ data: { token, platform } })).url }
    catch (e) { toast.error((e as Error).message); setBusy(null) }
  }

  if (missing) return <Shell><h1 className="text-2xl font-bold">This link isn't valid</h1><p>Reply to community@createracket.com for a new one.</p></Shell>
  if (!info) return <Shell><p>Loading…</p></Shell>

  return <Shell>
    <div>
      <p className="text-sm text-muted-foreground">Racket{info.campaignTitle ? ` · ${info.campaignTitle}` : ''}</p>
      <h1 className="text-3xl font-bold">Connect your accounts</h1>
      <p className="mt-2">{info.creatorName ? `Hi ${info.creatorName}, ` : ''}connecting lets us read the results of your campaign posts directly, so you don't need to send screenshots.</p>
    </div>
    {status?.startsWith('connected-') && <p className="rounded-md border border-border bg-muted p-3 text-sm">Thanks — {LABEL[status.slice(10) as 'instagram' | 'tiktok'] ?? 'your account'} is connected.</p>}
    {status === 'error' && <p className="rounded-md border border-destructive p-3 text-sm">That didn't work. Please try again, or reply to community@createracket.com.</p>}
    {status === 'cancelled' && <p className="rounded-md border border-border p-3 text-sm">Connection cancelled — nothing was shared.</p>}
    <div className="space-y-3">
      {(['instagram', 'tiktok'] as const).map(p => {
        const conn = info.connected.find(c => c.platform === p)
        return <div key={p} className="flex items-center justify-between gap-3 rounded-md border border-border p-4">
          <div><p className="font-semibold">{LABEL[p]}</p><p className="text-xs text-muted-foreground">{conn ? `Connected${conn.username ? ` as @${conn.username}` : ''}` : info.available[p] ? 'Not connected' : 'Coming soon'}</p></div>
          <Button disabled={!info.available[p] || busy !== null} onClick={() => connect(p)}>{busy === p ? 'Opening…' : conn ? 'Reconnect' : `Connect ${LABEL[p]}`}</Button>
        </div>
      })}
    </div>
    <p className="text-xs text-muted-foreground">We only read your profile name, follower count and post results. We can't post, message or change anything. Instagram needs a professional (creator or business) account. Email community@createracket.com anytime to disconnect.</p>
  </Shell>
}
