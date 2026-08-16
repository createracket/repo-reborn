# Fix user search when sharing listening reports

## What I checked

- The share panel on Racket Desk > Reports (`ReportDashboardShare`) searches people through the `searchReportAssignees` server function, which reads `profiles` and filters on name/email.
- Database side is healthy: admins have a SELECT policy on `profiles`, table grants are in place, and there are currently only 3 profiles in the account. So there is nothing blocking the read — the problem is in how the search behaves, not permissions.

## Why it feels broken

1. **Nothing happens until you click "Search"** — typing a name and expecting results does nothing, and there is no results list until the button (or Enter) is pressed.
2. **No empty state** — if the search returns no one, the panel shows nothing at all, so it looks like the search failed rather than "no match".
3. **Fragile query** — the name/email filter is injected raw into the database filter string. Any comma, parenthesis, `%` or quote in the typed text corrupts the filter, which can silently return nothing or error.
4. **Already-assigned people aren't distinguished until after a search**, and there is no way to browse the (small) list of users without typing.

## The fix

**Behaviour**
- Load the list of assignable profiles once when the panel opens, and filter it live as you type — the same pattern already used for sharing briefs. The "Search" button becomes unnecessary and is removed.
- Show up to a handful of suggestions immediately (no typing required) so a small user list can just be picked from.
- Show a clear "No profiles match" message when a query has no results.
- Mark people already assigned in the list, and keep the existing assign/unassign toggles working.

**Server function**
- Harden `searchReportAssignees`: escape the user text before it goes into the name/email filter so commas, quotes and wildcards can't break the query, raise the result limit modestly, and order by display name with email as a fallback so unnamed profiles still appear.

## Technical notes

- `src/lib/racket-desk/report-sharing.functions.ts`: sanitise `data.q` (strip/escape `,`, `(`, `)`, `"`, `%`, `\`) before building the `.or(...)` filter; keep the admin check unchanged; return profiles with `display_name`, `email`.
- `src/components/racket-desk/ReportDashboardShare.tsx`: fetch the assignable list on open (empty query), hold it in state, derive filtered suggestions with `useMemo` from the input value, drop the manual search button and `searching` state, add the empty-state line, and keep `setReportAssignee` calls as-is.
- No database migration required.
