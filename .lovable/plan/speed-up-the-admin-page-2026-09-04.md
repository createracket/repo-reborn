# Speed up the Admin page

## What I found

No bug — the data is tiny (193 profiles, 145 subscribers, 8 campaigns, 3 spotlights, 12 vibe responses). The slowness is load structure:

1. **Everything loads before anything shows.** The page waits on a chain: auth session check (layout) → a second `getUser()` network call → admin role query → 9 parallel table queries → a follow-up profiles query for spotlight interests → only then does the page render. Any one slow link holds the whole screen on "Loading…".
2. **One giant bundle.** The admin route file is ~157KB on its own and eagerly imports every tab's code — Traffic, Emails, Vibe check, Community, Sound board, Usage, FAQs, Brief form, plus the scraper and AI-draft server-function modules. You download and parse all of it even though only one tab is visible.
3. **All tabs' data is fetched up front**, including tables you may never open on a given visit (mailing list, contacts, vibe responses, spotlight interests).
4. **Redundant auth round-trip.** The `_authenticated` layout already resolved the session; admin then calls `getUser()` again over the network before it can even ask about the role.

## What to change

1. **Render the shell immediately.** Show the admin header and tab bar as soon as the role check passes, with per-section skeletons while data lands — instead of one blocking "Loading…" screen.
2. **Lazy-load tab code.** Each heavy tab panel loads its own code only when opened, so the initial download is a fraction of today's.
3. **Load per tab, not all at once.** Fetch only what the active tab needs; other tabs fetch on first open and then cache for the session.
4. **Remove the auth round-trip.** Reuse the session the layout already has, and check the admin role in one query.
5. **Trim the up-front payload.** Replace `select("*")` on the wide tables with the columns actually rendered, and cap long lists with a sensible page size.

Expected result: the admin page paints in well under a second, with each tab filling in as you click into it.

## Technical notes

- `src/routes/_authenticated.admin.tsx`: split the mega-effect into a fast role gate plus per-tab loaders keyed by the active tab; keep the existing `?tab=`/`?edit=` deep links working (deep-linked tab loads first, spotlight edit fetch stays).
- Wrap tab panels in `React.lazy` + `Suspense` with skeleton fallbacks: Traffic, Emails, Vibe check, Community, Sound board, Usage, FAQs, Brief form, Example opportunities.
- Move `campaign-scrapers.functions` / `spotlight-draft.functions` / `spotlight-images.functions` imports into the spotlight editor component so they leave the initial chunk.
- Reuse the session from the `_authenticated` gate (context or `getSession()`) rather than `supabase.auth.getUser()`.
- Narrow `select("*")` on `lead_briefs`, `contact_messages`, `mailing_list_subscribers`, and `partner_pages` to rendered columns.
- No schema, RLS, or grant changes; admin-only behaviour and permissions unchanged.
