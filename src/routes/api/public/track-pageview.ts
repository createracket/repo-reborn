import { createFileRoute } from '@tanstack/react-router'

// Known bot/crawler signatures. Match conservatively — a true positive means
// the row is still recorded but flagged so admins can filter it out.
const BOT_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /googlebot|google-inspectiontool|adsbot-google|mediapartners-google/i, reason: 'Googlebot' },
  { re: /bingbot|bingpreview/i, reason: 'Bingbot' },
  { re: /duckduckbot/i, reason: 'DuckDuckBot' },
  { re: /yandex(bot|images)/i, reason: 'YandexBot' },
  { re: /baiduspider/i, reason: 'Baiduspider' },
  { re: /sogou|360spider|bytespider|petalbot|toutiaospider/i, reason: 'CN crawler' },
  { re: /semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|seznambot|serpstatbot/i, reason: 'SEO crawler' },
  { re: /facebookexternalhit|facebot|meta-externalagent/i, reason: 'Facebook crawler' },
  { re: /twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp/i, reason: 'Social preview bot' },
  { re: /applebot|pinterestbot|redditbot/i, reason: 'Social/search bot' },
  { re: /gptbot|chatgpt-user|oai-searchbot|claudebot|anthropic-ai|perplexitybot|youbot|cohere-ai|ccbot/i, reason: 'AI crawler' },
  { re: /bot\b|crawler|crawling|spider|slurp|scraper|fetch|http[-_ ]?client/i, reason: 'Generic bot UA' },
  { re: /headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed/i, reason: 'Headless browser' },
  { re: /curl|wget|python-requests|axios|go-http-client|okhttp|java\/|libwww/i, reason: 'HTTP library' },
  { re: /monitor|uptimerobot|pingdom|statuscake|newrelic|datadog/i, reason: 'Monitoring service' },
  { re: /preview|prerender/i, reason: 'Preview renderer' },
]

function detectBot(ua: string | null): string | null {
  if (!ua || ua.length < 5) return 'Empty/short UA'
  for (const { re, reason } of BOT_PATTERNS) if (re.test(ua)) return reason
  return null
}

export const Route = createFileRoute('/api/public/track-pageview')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any
        try {
          body = await request.json()
        } catch {
          return new Response('Bad request', { status: 400 })
        }

        const sessionId = String(body?.session_id ?? '')
        const path = String(body?.path ?? '')
        const referrer = body?.referrer ? String(body.referrer).slice(0, 1024) : null
        const ua = request.headers.get('user-agent')?.slice(0, 512) ?? null
        const country =
          request.headers.get('cf-ipcountry') ??
          request.headers.get('x-vercel-ip-country') ??
          request.headers.get('x-country') ??
          null

        if (sessionId.length < 8 || sessionId.length > 64) return new Response('Bad session', { status: 400 })
        if (path.length < 1 || path.length > 512) return new Response('Bad path', { status: 400 })

        const botReason = detectBot(ua)

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { error } = await supabaseAdmin.from('page_views').insert({
          session_id: sessionId,
          path,
          referrer,
          user_agent: ua,
          is_bot: botReason !== null,
          bot_reason: botReason,
          country: country && country !== 'XX' ? country.toUpperCase().slice(0, 2) : null,
          user_id: null,
        })

        if (error) {
          console.error('page_views insert failed', error)
          return new Response('error', { status: 500 })
        }
        return new Response('ok')
      },
    },
  },
})
