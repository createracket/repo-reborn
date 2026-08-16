# Listening reports in the Project planner

Listening reports stop being their own dashboard card and become planner tiles, exactly like briefs, rosters and campaign reports.

## What changes

1. **No separate "Listening reports" card**
   - The standalone card is removed from the dashboard.
   - Shared listening reports appear as 1:1 tiles inside Project planner, alongside briefs, rosters and reports.

2. **Tile format**
   - Same `PlannerTile`: square thumbnail left, title + `@handle · date` sub-line, and a white **View your report** button on the right (matching the brief tiles).
   - No thumbnail set → neat lettered placeholder.

3. **Thumbnails for listening reports**
   - Racket Desk → Reports gains a square **Thumbnail image** upload plus the same framing controls used everywhere else (Fit, Background, Zoom, Vertical position) and a live 1:1 preview of the planner tile.

4. **A real report page**
   - New page at `/listening-report/<id>` showing the full report: title, notes, What's working, Fan signals, Make next, top posts — the content currently expanded inline on the dashboard, laid out as a proper page.
   - Visible only to admins and the users the report is shared with. `noindex, nofollow`, excluded from the sitemap and disallowed in robots.txt, same as roster/report/brief pages.

5. **Sharing, same picker as briefs**
   - The Racket Desk report sharing block is rebuilt to mirror the brief share UI: search users by name or email, a list of who it's shared with, and remove buttons.
   - A **Share with me (admin)** shortcut assigns the report to your own account so it shows in your planner too.
   - Reports only show on a user's planner when explicitly shared; the current "push to dashboard" toggle stays as the master on/off.

## Technical notes

- Migration: add `thumbnail_url text` and `thumb_frame jsonb` to `public.social_listening_scans`; no grant changes needed beyond what the table already has.
- Sharing continues to use `social_listening_scan_shares`. `listDashboardReports` in `src/lib/racket-desk/report-sharing.functions.ts` gains the thumbnail columns and stops returning full `analysis`/`posts` for the planner list; a new `getListeningReport` server fn (auth-gated, RLS-scoped) feeds the detail page.
- Non-admin visibility: admins currently see every dashboard-visible report. Reads are tightened so non-admins only get reports in `social_listening_scan_shares` for their user id, and admins see their own shares plus everything (unchanged for admin).
- New route `src/routes/_authenticated.listening-report.$id.tsx` with `noindex` head meta.
- Builder changes in `src/routes/_authenticated.racket-desk.reports.tsx` and `src/components/racket-desk/ReportDashboardShare.tsx`, reusing `src/lib/spotlight-images.functions.ts` for uploads and `ThumbFrameControls` / `src/lib/thumb-frame.ts` for framing.
- `src/routes/_authenticated.dashboard.tsx`: drop `<ListeningReportsCard />`, render shared listening reports through `PlannerTile` in the planner grid.
