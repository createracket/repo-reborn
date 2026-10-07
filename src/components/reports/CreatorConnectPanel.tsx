import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Link2, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { createCreatorConnectLink, syncPostFromCreatorAccount } from '@/lib/creator-connect.functions'
import { Button } from '@/components/ui/button'

type Conn = { platform: string; username: string | null; last_sync_at: string | null; last_error: string | null }

export function CreatorConnectPanel({ postId, creatorId, platform, postUrl, onSynced }: { postId: string; creatorId: string; platform: string; postUrl: string | null; onSynced?: () => void }) {
  const makeLink = useServerFn(createCreatorConnectLink)
  const sync = useServerFn(syncPostFromCreatorAccount)
  const [conn, setConn] = useState<Conn | null>(null)
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('creator_social_connections').select('platform, username, last_sync_at, last_error').eq('creator_id', creatorId).eq('platform', platform).maybeSingle()
    setConn((data as Conn | null) ?? null)
  }, [creatorId, platform])
  useEffect(() => { void refresh() }, [refresh])
  if (!['instagram', 'tiktok'].includes(platform)) return null

  async function copyLink() {
    try { const { url } = await makeLink({ data: { creatorId } }); await navigator.clipboard.writeText(url); toast.success('Connect link copied — send it to the creator') }
    catch (e) { toast.error((e as Error).message) }
  }
  async function doSync() {
    setBusy(true)
    try { await sync({ data: { postId } }); toast.success('Stats updated from the creator’s account'); onSynced?.() }
    catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false); void refresh() }
  }
  return <div className="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="outline" onClick={copyLink}><Link2 className="mr-2 size-4" />{conn ? 'Copy reconnect link' : 'Copy connect link'}</Button>
    {conn ? <>
      <span className="text-xs text-muted-foreground">Connected{conn.username ? ` @${conn.username}` : ''}{conn.last_error ? ` · last sync failed` : ''}</span>
      <Button size="sm" variant="outline" disabled={busy || !postUrl} onClick={doSync}><RefreshCw className={`mr-2 size-4 ${busy ? 'animate-spin' : ''}`} />Sync from account</Button>
    </> : <span className="text-xs text-muted-foreground">Account not connected</span>}
  </div>
}
