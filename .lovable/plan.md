## Goal

Add a **Project Planner** section to the user dashboard, surface briefs on both the user and admin dashboards, and give admins a single, editable view of every brief (from logged-in users and from leads).

## Statuses

Five values across every brief:
`submitted` · `in_review` · `in_progress` · `review_your_roster` · `review_your_report`

Defaults to `submitted` on insert.

## 1. Database

- Update the `status` column default on `campaign_briefs` and `lead_briefs` to `submitted`.
- Add a CHECK constraint on both tables restricting `status` to the five values above (so admin picker can't drift).
- RLS: signed-in users can already read their own `campaign_briefs`; admins already have full access. Confirm and top up if needed.

## 2. Brief submission (/connect)

- When the visitor is signed in, insert into `campaign_briefs` with `user_id`, prefilling `contact_email` from their account.
- When not signed in, keep inserting into `lead_briefs` (unchanged).
- Success screen adds a "View in your dashboard" CTA for signed-in submitters.

## 3. User dashboard — Project Planner section

New card above "Your roster", styled to match the existing cards.

- If the user has no briefs: prominent "Submit a brief" CTA plus a short "here's how it works" line.
- If they have briefs: list each with title, submitted date, and a status pill using the five statuses. "Submit another brief" button at the top.
- The card also renders any assigned rosters/reports for that brief inline when the status reaches `review_your_roster` / `review_your_report`, linking to the existing published roster/report pages.

## 4. Admin dashboard — projects summary

On `/admin`, replace the two separate lists with a single **Briefs** view:

- One table combining `campaign_briefs` (attributed to a user) and `lead_briefs` (attributed to a lead name/company/email).
- Columns: Source (User / Lead), Name/Company, Title, Budget, Submitted, Status.
- Status column is a dropdown that writes back to the correct table. Admin can also open the brief for the full details (existing detail panel stays).
- Keeps the existing "New brief" form the admin uses to add on someone's behalf.

## 5. Homepage / entry points

No changes required — the existing header/nav "Connect" and dashboard CTA both keep working.

## Technical notes

- Reuse `supabase` client from `@/integrations/supabase/client` throughout (no new server functions needed; RLS + admin `has_role` already covers access).
- Status pill component: small helper in `src/components/briefs/BriefStatusBadge.tsx` used by both dashboards, with the same color per status.
- Status dropdown: shadcn `Select`, admin-only, writes with a targeted `update({ status }).eq('id', ...)` against whichever source table the row belongs to.
- No changes to existing published-brief flow (opportunities feed on dashboard) — that remains gated on `published = true`.
