# Campaign Manager

Turn Campaign Builder into a Campaign Manager: one campaign groups many briefs, rosters and reports, and becomes the one place to manage what is shared with dashboards and external users. Nothing that is live today changes how it looks or who can see it.

## What you will see

1. **Dev view button order**: the buttons stay in the same spot, but **Campaign Manager** comes first, then Roster Builder, Briefs, Campaign Reports, Racket Desk.
2. **Campaign Manager page** (same address as Campaign Builder, so old bookmarks still work): a list of campaign cards. Each card shows:
   - Campaign name, client, status (Draft / Active / Wrapped / Archived) and notes.
   - **Briefs**: both collab briefs (the current Campaign Builder ones) and brief pages (from /briefs). Use "+ New brief" or "Link existing".
   - **Rosters**: "+ New roster" opens Roster Builder with a new roster already linked to this campaign. "Link existing" lets you attach rosters you already have.
   - **Reports**: works the same way with Report Builder.
   - **Sharing panel**: one view of every linked item showing whether it is published, live on all dashboards, shared with specific users, or open to anyone with the link / behind an access code. The same switches you use today, gathered in one place.
3. **Unassigned items**: an "Unassigned" group lists anything not yet in a campaign, so nothing goes missing.
4. Roster Builder, Report Builder and the Briefs editors each show a small "Campaign: X" label with a link back to the campaign.

## Rules

- Every brief belongs to one campaign. A campaign can have any number of briefs, rosters and reports.
- A roster or report can belong to one campaign (it can be moved).
- New briefs created from the Campaign Manager are linked automatically. Briefs created elsewhere ask you to pick a campaign, or create one.

## Protecting live work

- Only new things are added. Nothing is renamed or removed, and no current link, share, publish setting or access code changes.
- One-time setup: each existing collab brief gets its own campaign, named after the brief. Its current linked roster and report are attached to that campaign. Brief pages, and rosters or reports with no brief, start in "Unassigned" for you to sort.
- The sharing panel uses the existing switches, so turning something on or off there does exactly what it does today.
- Before and after the change: check that the Tixel report, Tixel roster, CSV export, public briefs, and your and a member's dashboards still load the same.

## Technical details

- New `campaigns` table (id, owner_id, title, client_name, status, notes, display_order, timestamps), admin-only RLS via `has_role`, with explicit GRANTs.
- Add nullable `campaign_id` (FK, on delete set null) to `campaign_briefs`, `partner_pages` (section='brief' use), `rosters`, `campaign_reports`. `campaign_briefs` and `rosters`/`campaign_reports` use column-level grants, so add an explicit GRANT for each new column in the same migration.
- In the same migration, backfill: insert one campaign per `campaign_briefs` row, then set `campaign_id` on that brief and on its `linked_roster_id` / `linked_report_id` targets (and on rosters whose `brief_id` points to it). Keep the legacy `linked_roster_id`, `linked_report_id` and `rosters.brief_id` columns working; the campaign link sits on top of them.
- Never use `select("*")` on rosters or campaign_reports. Select named columns only.
- Roster Builder and Report creation accept a `?campaign=<id>` search param and set `campaign_id` on insert.
- Refactor `BriefsManager` into a `CampaignManager` page. The existing brief editor (including the free-member switch) stays as-is inside each campaign's Briefs list.
- Update the breadcrumb and planner labels to "Campaign Manager". Record the campaign grouping rule in AGENTS.md.
- The "every brief has a campaign" rule is enforced in the UI first. NOT NULL is left for a later step once every brief is assigned.
