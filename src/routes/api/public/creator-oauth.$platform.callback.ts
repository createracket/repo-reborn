import { createFileRoute } from '@tanstack/react-router'

// OAuth return from Instagram/TikTok. The signed `state` proves which creator link started it.
export const Route = createFileRoute('/api/public/creator-oauth/$platform/callback')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const s = await import('@/lib/creator-connect.server')
        const url = new URL(request.url)
        const back = (token: string | null, status: string) =>
          new Response(null, { status: 302, headers: { Location: token ? `${s.SITE}/creator-connect/${token}?status=${status}` : `${s.SITE}/` } })
        const state = s.verifyState(url.searchParams.get('state') ?? '')
        if (!state || state.platform !== params.platform) return back(null, 'error')
        const code = url.searchParams.get('code')
        if (!code) return back(state.token, 'cancelled')
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data: link } = await supabaseAdmin.from('creator_connect_links').select('creator_id').eq('token', state.token).maybeSingle()
        if (!link) return back(null, 'error')
        try {
          const t = await s.exchangeCode(state.platform, code.replace(/#_$/, ''))
          const { error } = await supabaseAdmin.from('creator_social_connections').upsert({
            creator_id: link.creator_id,
            platform: state.platform,
            account_id: t.accountId ?? null,
            username: t.username ?? null,
            access_token_enc: s.encrypt(t.accessToken),
            refresh_token_enc: t.refreshToken ? s.encrypt(t.refreshToken) : null,
            expires_at: t.expiresAt.toISOString(),
            refresh_expires_at: t.refreshExpiresAt?.toISOString() ?? null,
            connected_at: new Date().toISOString(),
            last_error: null,
          }, { onConflict: 'creator_id,platform' })
          if (error) throw error
          return back(state.token, `connected-${state.platform}`)
        } catch (e) {
          console.error('creator oauth failed', (e as Error).message)
          return back(state.token, 'error')
        }
      },
    },
  },
})
