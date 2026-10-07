// Server-only helpers for creator Instagram/TikTok account connections.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SITE = 'https://createracket.com'
export type Platform = 'instagram' | 'tiktok'
export const redirectUri = (p: Platform) => `${SITE}/api/public/creator-oauth/${p}/callback`

function secret(): string {
  const s = process.env['CREATOR_CONNECT_KEY']
  if (!s) throw new Error('CREATOR_CONNECT_KEY is not set')
  return s
}
const aesKey = () => createHash('sha256').update(`enc:${secret()}`).digest()

export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', aesKey(), iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')
}
export function decrypt(stored: string): string {
  const b = Buffer.from(stored, 'base64')
  const d = createDecipheriv('aes-256-gcm', aesKey(), b.subarray(0, 12))
  d.setAuthTag(b.subarray(12, 28))
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
}

// state = token.platform.expiry.signature — ties the OAuth return to one creator link.
export function signState(token: string, platform: Platform): string {
  const body = `${token}.${platform}.${Date.now() + 20 * 60_000}`
  const sig = createHmac('sha256', secret()).update(body).digest('hex').slice(0, 32)
  return `${body}.${sig}`
}
export function verifyState(state: string): { token: string; platform: Platform } | null {
  const parts = state.split('.')
  if (parts.length !== 4) return null
  const [token, platform, exp, sig] = parts
  const expected = createHmac('sha256', secret()).update(`${token}.${platform}.${exp}`).digest('hex').slice(0, 32)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  if (Number(exp) < Date.now() || (platform !== 'instagram' && platform !== 'tiktok')) return null
  return { token, platform }
}

export function oauthConfigured(p: Platform): boolean {
  return p === 'instagram'
    ? !!(process.env['INSTAGRAM_APP_ID'] && process.env['INSTAGRAM_APP_SECRET'])
    : !!(process.env['TIKTOK_CLIENT_KEY'] && process.env['TIKTOK_CLIENT_SECRET'])
}

export function authorizeUrl(p: Platform, state: string): string {
  if (p === 'instagram') {
    const u = new URL('https://www.instagram.com/oauth/authorize')
    u.searchParams.set('client_id', process.env['INSTAGRAM_APP_ID']!)
    u.searchParams.set('redirect_uri', redirectUri(p))
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights')
    u.searchParams.set('state', state)
    return u.toString()
  }
  const u = new URL('https://www.tiktok.com/v2/auth/authorize/')
  u.searchParams.set('client_key', process.env['TIKTOK_CLIENT_KEY']!)
  u.searchParams.set('redirect_uri', redirectUri(p))
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', 'user.info.basic,user.info.profile,user.info.stats,video.list')
  u.searchParams.set('state', state)
  return u.toString()
}

type Tokens = { accessToken: string; refreshToken?: string; expiresAt: Date; refreshExpiresAt?: Date; accountId?: string; username?: string }

export async function exchangeCode(p: Platform, code: string): Promise<Tokens> {
  if (p === 'instagram') {
    const form = new URLSearchParams({ client_id: process.env['INSTAGRAM_APP_ID']!, client_secret: process.env['INSTAGRAM_APP_SECRET']!, grant_type: 'authorization_code', redirect_uri: redirectUri(p), code })
    const r = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form })
    const short = await r.json() as any
    if (!r.ok || !short.access_token) throw new Error(`Instagram token exchange failed (${r.status})`)
    const l = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(process.env['INSTAGRAM_APP_SECRET']!)}&access_token=${encodeURIComponent(short.access_token)}`)
    const long = await l.json() as any
    const accessToken = long.access_token ?? short.access_token
    const expiresAt = new Date(Date.now() + (long.expires_in ?? 3600) * 1000)
    const me = await (await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`)).json() as any
    return { accessToken, expiresAt, accountId: String(me.user_id ?? short.user_id ?? ''), username: me.username }
  }
  const form = new URLSearchParams({ client_key: process.env['TIKTOK_CLIENT_KEY']!, client_secret: process.env['TIKTOK_CLIENT_SECRET']!, code, grant_type: 'authorization_code', redirect_uri: redirectUri(p) })
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  const t = await r.json() as any
  if (!r.ok || !t.access_token) throw new Error(`TikTok token exchange failed (${r.status})`)
  const info = await (await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name', { headers: { Authorization: `Bearer ${t.access_token}` } })).json() as any
  return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(Date.now() + t.expires_in * 1000), refreshExpiresAt: new Date(Date.now() + (t.refresh_expires_in ?? 0) * 1000), accountId: t.open_id, username: info?.data?.user?.username ?? info?.data?.user?.display_name }
}

type ConnRow = { id: string; platform: string; access_token_enc: string; refresh_token_enc: string | null; expires_at: string | null }

/** Returns a usable access token, refreshing (and saving) it when needed. */
export async function freshToken(admin: any, row: ConnRow): Promise<string> {
  const token = decrypt(row.access_token_enc)
  const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (row.platform === 'tiktok') {
    if (exp > Date.now() + 5 * 60_000) return token
    if (!row.refresh_token_enc) throw new Error('TikTok connection expired — ask the creator to reconnect.')
    const form = new URLSearchParams({ client_key: process.env['TIKTOK_CLIENT_KEY']!, client_secret: process.env['TIKTOK_CLIENT_SECRET']!, grant_type: 'refresh_token', refresh_token: decrypt(row.refresh_token_enc) })
    const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    const t = await r.json() as any
    if (!r.ok || !t.access_token) throw new Error('TikTok connection expired — ask the creator to reconnect.')
    await admin.from('creator_social_connections').update({ access_token_enc: encrypt(t.access_token), refresh_token_enc: t.refresh_token ? encrypt(t.refresh_token) : row.refresh_token_enc, expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString() }).eq('id', row.id)
    return t.access_token
  }
  if (exp < Date.now()) throw new Error('Instagram connection expired — ask the creator to reconnect.')
  // Long-lived IG tokens last ~60 days; extend when under 30 days remain.
  if (exp < Date.now() + 30 * 86_400_000) {
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`)
    const t = await r.json() as any
    if (r.ok && t.access_token) {
      await admin.from('creator_social_connections').update({ access_token_enc: encrypt(t.access_token), expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString() }).eq('id', row.id)
      return t.access_token
    }
  }
  return token
}

export type PostMetrics = { views?: number; likes?: number; comments?: number; shares?: number; saves?: number; followers?: number }

const igCode = (url: string) => url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null

export async function fetchInstagramPost(token: string, postUrl: string): Promise<PostMetrics> {
  const code = igCode(postUrl)
  if (!code) throw new Error('Could not read the Instagram post link.')
  const enc = encodeURIComponent(token)
  let next: string | null = `https://graph.instagram.com/v21.0/me/media?fields=id,permalink,like_count,comments_count&limit=50&access_token=${enc}`
  let media: any = null
  for (let page = 0; next && page < 6 && !media; page++) {
    const r: Response = await fetch(next)
    const j = await r.json() as any
    if (!r.ok) throw new Error(`Instagram media lookup failed (${r.status})`)
    media = (j.data ?? []).find((m: any) => igCode(m.permalink ?? '') === code) ?? null
    next = j.paging?.next ?? null
  }
  if (!media) throw new Error("This post wasn't found on the connected Instagram account.")
  const out: PostMetrics = { likes: media.like_count, comments: media.comments_count }
  for (const metrics of ['views,reach,saved,shares', 'views,saved,shares', 'saved,shares']) {
    const r = await fetch(`https://graph.instagram.com/v21.0/${media.id}/insights?metric=${metrics}&access_token=${enc}`)
    if (!r.ok) continue
    const j = await r.json() as any
    for (const m of j.data ?? []) {
      const v = m.values?.[0]?.value ?? m.total_value?.value
      if (typeof v !== 'number') continue
      if (m.name === 'views') out.views = v
      if (m.name === 'saved') out.saves = v
      if (m.name === 'shares') out.shares = v
    }
    break
  }
  const me = await (await fetch(`https://graph.instagram.com/v21.0/me?fields=followers_count&access_token=${enc}`)).json() as any
  if (typeof me.followers_count === 'number') out.followers = me.followers_count
  return out
}

export async function fetchTikTokPost(token: string, postUrl: string): Promise<PostMetrics> {
  const id = postUrl.match(/\/(?:video|photo)\/(\d+)/)?.[1]
  if (!id) throw new Error('Could not read the TikTok video link.')
  const r = await fetch('https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: { video_ids: [id] } }) })
  const j = await r.json() as any
  if (!r.ok) throw new Error(`TikTok video lookup failed (${r.status})`)
  const v = j.data?.videos?.[0]
  if (!v) throw new Error("This video wasn't found on the connected TikTok account.")
  const out: PostMetrics = { views: v.view_count, likes: v.like_count, comments: v.comment_count, shares: v.share_count }
  const info = await (await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count', { headers: { Authorization: `Bearer ${token}` } })).json() as any
  if (typeof info?.data?.user?.follower_count === 'number') out.followers = info.data.user.follower_count
  return out
}
