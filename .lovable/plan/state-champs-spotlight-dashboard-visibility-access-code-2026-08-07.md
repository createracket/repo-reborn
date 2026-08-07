# State Champs spotlight: dashboard visibility + access code

## What's actually happening

Two separate things control whether a spotlight reaches a dashboard, and the State Champs row (`/spotlight/champs`) currently fails the first one:

- Published: yes
- Show on dashboards: **off** — this is why it isn't appearing
- Access code: set

So the access code isn't the blocker for listing. Turning on the "Show on dashboards" toggle in the Admin > Spotlights row is the immediate fix.

## But yes, the access code does restrict who can see it

With an access code set, only two groups can see the spotlight at all:

- Admins
- People you've explicitly shared it with (by account or email) in the spotlight's share list

Everyone else won't see it on their dashboard even with the dashboard toggle on. That's the intended "tailored to specific users" behaviour — publishing plus a code plus a share list = private to named people.

## The gap worth fixing

Right now, a shared, signed-in user who clicks the spotlight card from their dashboard is still shown the email + passcode gate. Only admins pass straight through. Rosters and reports already handle this properly (signed-in owners/assigned emails bypass the gate).

Proposed change: bring spotlights in line with rosters and reports — a signed-in user who is an admin, or who is on the spotlight's share list (by user ID or email), loads the page directly. External visitors with just the link still get the email + code gate, and their emails still get captured as leads.

## Result: both options available

| Setup | Who sees it |
| --- | --- |
| Published, dashboard on, no code | All signed-in users' dashboards; link works for anyone; still noindexed |
| Published, dashboard on, code + shares | Only named people see the card and open it directly; anyone else with the link must enter email + code |
| Published, dashboard off, code | Link + code only; no dashboard placement |

## Technical notes

- Add `getSpotlightForMember` to `src/lib/spotlight-access.functions.ts`, mirroring `getRosterForMember` / `getReportForMember`: `requireSupabaseAuth`, then allow if `has_role(admin)` or a matching row in `partner_page_shares` (target_user_id or lowercased target_email vs JWT email), returning the full page payload via the admin client.
- In `src/routes/spotlight.$slug.tsx`, attempt that member fetch before rendering the passcode gate when a session exists; fall back to the gate otherwise.
- No schema change. Existing RLS on `partner_pages` already encodes the same access rule, so the server function only mirrors it.
- Search visibility is unchanged: `robots.txt` disallows `/spotlight/`, the route emits `noindex, nofollow`, and the sitemap excludes spotlights.
