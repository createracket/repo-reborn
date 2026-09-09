# Make the whole site faster

## What's actually slow (verified)

Every page follows the same pattern, and it's the root cause:

1. **Nothing loads until the browser has done all the work.** No page fetches data on the server. The browser must download the page, run the code, check who you are, then start asking the database for content. That's why you keep seeing "Loading…" on admin pages, rosters and reports.
2. **Every visit re-asks who you are.** 39 separate sign-in checks across the site — the header, footer, breadcrumbs, edit button and the page itself each ask independently, several over the network rather than reading the session already in memory.
3. **Nothing is remembered between pages.** There's no caching layer in use at all, so going Dashboard → Admin → Dashboard refetches everything from scratch every time.
4. **A few page files are enormous** and get downloaded in full before anything shows: admin (164KB), roster builder (132KB), dashboard (81KB), campaign reports (74KB), profile (59KB).
5. **Wide queries.** 18 places still fetch every column of every row, including big text/JSON fields the screen never shows.

This gets worse, not better, once real users log in — so it's worth fixing at the pattern level rather than page by page.

## The plan

**Stage 1 — one shared sign-in check (biggest quick win, low risk)**
Replace the 39 independent checks with a single shared one resolved once per visit. Header, footer, breadcrumbs and page content then all read the same answer instantly. Removes a network round-trip from the front of nearly every page.

**Stage 2 — remember data between pages**
Introduce the caching layer that's already installed but unused, so revisiting a page shows content instantly while any updates refresh quietly in the background. Applied first to dashboard, admin, rosters and reports.

**Stage 3 — split the big pages**
Break the five largest pages so each one only downloads the part you're actually looking at (the builder forms, the individual admin tabs, the heavy editors). Same as what's already been done for admin tabs and the briefs builder, extended to roster builder, campaign reports, dashboard and profile.

**Stage 4 — start public pages on the server**
Public pages (rosters, reports, briefs, spotlights, homepage) render their content on the server so visitors see it immediately, with no blank-then-fill step. Also improves how they appear when shared and in search results.

**Stage 5 — trim the queries and images**
Fetch only the columns each screen shows, cap long lists, and apply the resized-image approach already used on roster avatars across profiles, spotlights, reports and the homepage.

Suggested order: 1 and 2 together (they compound), then 3, then 4, then 5. Each stage is shippable on its own.

## Technical notes

- Stage 1: a `useAuth` hook + provider backed by one `getSession()` and an `onAuthStateChange` subscription; replace `supabase.auth.getUser()` calls in components with it. Keep server-side `requireSupabaseAuth` untouched.
- Stage 2: use the existing `QueryClient` in `src/router.tsx`; wrap current effect fetches in `useQuery` with stable keys and sensible `staleTime`; set defaults in `getRouter()`.
- Stage 3: `React.lazy` + `Suspense` for `SpotlightForm`, roster builder editors, campaign report editor, dashboard panels, profile sections; move scraper/AI/server-function imports into the components that use them.
- Stage 4: route `loader` + `ensureQueryData` for `/roster/$slug`, `/report/$slug`, `/brief/$slug`, `/spotlight/$slug`, `/`. Public reads only — never call `requireSupabaseAuth` functions from a public loader (prerender has no session). Passcode-gated paths keep their current client flow.
- Stage 5: replace remaining `select("*")` in routes/components with explicit column lists (respecting the restricted email columns on `rosters`/`campaign_reports`); reuse `storageImage()` helper; add `loading="lazy"` + dimensions to off-screen images.
- No schema, RLS or grant changes in any stage.
