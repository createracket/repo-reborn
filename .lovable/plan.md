# Briefs: own URL + push to user dashboards

## What changes

1. **Brief pages live at `/brief/<slug>`**
   - Briefs currently render at `/spotlight/<slug>` even though they are managed in the Admin "Briefs" tab.
   - A new `/brief/<slug>` route renders the same page. Old `/spotlight/<slug>` links for briefs keep working via an automatic redirect to `/brief/<slug>`, and vice versa (a spotlight opened at `/brief/...` redirects back), so nothing already shared breaks.
   - Admin Briefs list, "View / Preview" buttons, and copy-link actions all point at `/brief/<slug>`.
   - Same access rules as today: passcode/email gate where set, and `noindex, nofollow` so briefs stay unlisted.

2. **Push a brief to specific users' dashboards**
   - The brief builder gets the same "Shared with" panel the spotlight builder uses: search a user by name/email, add them, remove them.
   - Anyone a brief is shared with sees it on their dashboard inside the **Project planner** card, as a brief tile linking to `/brief/<slug>`.

3. **Secondary option: show in Featured spotlights**
   - A per-brief toggle ("Also show in Featured spotlights") places the brief in the dashboard's Featured spotlights carousel as well as, or instead of, the planner.
   - Placement choice per brief: Project planner (default), Featured spotlights, or both.
   - Side fix: the dashboard's Featured spotlights carousel currently pulls every `partner_pages` row regardless of section, so briefs can already appear there unintentionally. It will be filtered to spotlights plus briefs explicitly opted in.

## Technical notes

- **Route**: extract the current `spotlight.$slug.tsx` body into a shared page component; `spotlight.$slug.tsx` and a new `brief.$slug.tsx` both render it and redirect when the loaded row's `section` doesn't match the URL. Breadcrumb labels in `PageBreadcrumbs.tsx` gain a `/brief/` case.
- **Schema**: add `dashboard_placement text not null default 'planner'` to `public.partner_pages` (values `planner` | `spotlight` | `both`); keep `dashboard_visible` as the on/off switch. No new sharing table — reuse `partner_page_shares` (already RLS-scoped so a target user can read the shared page).
- **Admin**: `_authenticated.briefs.tsx` renders `PartnerPageShares` for the brief being edited plus the placement control; `SpotlightForm` persists `dashboard_placement`.
- **Dashboard** (`_authenticated.dashboard.tsx`): one query for `partner_pages` where `section = 'brief'` and (published + dashboard_visible) or shared-to-me, split by `dashboard_placement` into the planner list and the spotlight carousel; the existing spotlight query gains `.eq('section','spotlight')`.
