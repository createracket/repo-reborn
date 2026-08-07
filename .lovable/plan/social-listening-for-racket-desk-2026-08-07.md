# Social Listening for Racket Desk

Add a new admin-only "Social listening" tab to Racket Desk that pulls an artist's recent
Instagram Reels (and optionally TikTok), ranks them, and returns an AI read on what's
working and what to make next. Also tidy the cluttered Racket Desk landing screen.

## Answering "is that everything we need?"

Your Gemini script is the right shape, but three parts don't fit this project:

1. **No Supabase Edge Function.** This app is TanStack Start — server logic lives in
   `createServerFn`, same as the existing Apify scrapers in `campaign-scrapers.functions.ts`.
   No CORS block, no `serve()`, no separate function URL.
2. **No OpenAI key needed.** The project has no `OPENAI_API_KEY`; it uses the built-in
   Lovable AI gateway (Gemini). Same JSON-mode analysis, no new secret, no extra billing setup.
3. **Apify token already exists** (`APIFY_API_TOKEN`) and the actor-run helper is already
   written — the new code reuses it rather than re-implementing the fetch.

Everything else (reel scrape -> engagement score -> top 5 -> AI sentiment pick of top 3)
carries over as-is.

## What gets built

### 1. Social listening tab
New route `/racket-desk/social-listening`, added to the Racket Desk nav (already admin-gated
by the layout, plus a server-side admin check on the analysis call).

Screen layout:
- **Input row**: artist name + Instagram handle, optional TikTok handle, results limit
  (default 30), "Run listening" button.
- **Top content**: the AI-selected top 3 posts as cards — thumbnail/link, views, likes,
  comments, sentiment score, and the one-line reason it landed. Below that, a collapsed
  "All scanned posts" table ranked by engagement score.
- **Strategy read**: AI summary panel — what formats/hooks are working, what the comments
  say fans want, and 3–5 concrete future content ideas for that artist.
- **Saved scans**: each run is stored so you can reopen an artist's history and compare,
  rather than re-paying for a scrape every time.

### 2. Tidy the Racket Desk landing screen
Current "Today" page stacks a hero, search/filter bar, 4 stat cards, 6 trend cards and a
4-card sidebar all at once. Cleanup:
- Compact the hero to a single line + date, drop the oversized 4xl/5xl heading.
- Reduce the stat row to the two that mean something, inline and smaller.
- Trend feed becomes a tighter list: 3 cards visible, "Show more" for the rest.
- Sidebar keeps Daily idea + Strategist note; Roster matches and Regional pulse move behind
  a collapsed "More signals" block (they're placeholder data today).
- Remove the non-functional search and filter controls until they do something.

## Technical notes

- `src/lib/racket-desk/social-listening.functions.ts` — `runSocialListening` server fn:
  `.middleware([requireSupabaseAuth])`, verifies `has_role(uid,'admin')`, then runs
  `apify~instagram-reel-scraper` via the existing actor helper, scores
  `views + likes*2 + comments*5`, takes top 5, and sends them to the Lovable AI gateway
  (`google/gemini-3.6-flash`, JSON response) for sentiment + top-3 selection + strategy notes.
  Returns a plain DTO; errors surface as `{ ok: false, error }` in the UI.
- New table `public.social_listening_scans` (artist name, platform, handle, raw ranked posts,
  AI result, created_by) with RLS + GRANTs restricting all access to admins.
- Usage safeguard: reuse the existing usage metering so scans are counted and a single artist
  can't be re-scraped in a tight loop.
- Route file `src/routes/_authenticated.racket-desk.social-listening.tsx`; nav entry added to
  `src/routes/_authenticated.racket-desk.tsx`.

## Not included

TikTok listening ships as the same pattern once Instagram is proven — the input is there but
wired second, so the first pass stays cheap to validate.
