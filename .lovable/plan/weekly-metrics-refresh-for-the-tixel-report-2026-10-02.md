# Weekly metrics refresh for the Tixel report

## What changes
The report metrics currently refresh automatically once a month (2am Sydney on the 1st). We're switching that to **every Monday at 2am Sydney time**, so the client's dashboard can pull a CSV with numbers no more than a week old. The same 2am window and the same "update all metrics" job are reused — nothing else about the update changes.

## What the client sees
- The **Download CSV** button and the CSV link work exactly as before.
- Numbers now refresh **every Monday around 2am Sydney** instead of monthly. The client can fetch the CSV any time; it just gets fresher numbers each Monday.
- From 6am Sydney each Monday, the CSV is safe to fetch for that week.

## Updated client note (ready to copy)
> Hi team, your Tixel report metrics now refresh automatically **every Monday around 2am Sydney time** (previously monthly). Please schedule your dashboard to fetch the CSV any time after 6am Sydney on Mondays, or any time later in the week — the numbers only change after the refresh.
> - **CSV link:** https://createracket.com/report/tixel-report/metrics.csv
> - There's also a "Download CSV" button at the top of the report page.

## Updated dev-team note (ready to copy)
> - **Endpoint:** unchanged — `GET https://createracket.com/report/tixel-report/metrics.csv`
> - **Schedule change:** metrics now refresh weekly, every Monday around 02:00 Australia/Sydney. Fetch any time after 06:00 Australia/Sydney on Mondays for that week's numbers.
> - Format, columns, and the `post_url` / `metrics_updated_at` keys are unchanged.

## Technical details
1. **Hook gating** — `src/routes/api/public/hooks/monthly-report-refresh.ts` currently runs only when it's 2am on the 1st in Sydney. Change that check to "2am on a **Monday** in Sydney" (weekday check via the same `Intl.DateTimeFormat` pattern). The route path stays the same so nothing else needs to move.
2. **Schedule** — the cron job that calls the hook currently fires daily at 15:00 and 16:00 UTC and the hook self-gates. Tighten it to Mondays only (`0 15,16 * * 1`, renamed `weekly-report-refresh`), which still covers both daylight-saving variants of 2am Sydney. Run via a scheduled-SQL update (it contains the hook URL and token, so it doesn't go in a migration).
3. **Builder label** — the report builder switch reads "Refresh metrics monthly"; change it to "Refresh metrics weekly" (`src/routes/_authenticated.campaign-reports.tsx`), keeping the same `auto_refresh_monthly` setting underneath.
4. **Apify usage** — each run is 54 post fetches (a few cents); weekly is roughly 4× that, still under a dollar a month. No AI tokens are used.

## Verification
- Typecheck plus a build check after the edit.
- Dry-run the hook's date logic against a few sample dates/times (Monday 2am AEST, Monday 2am AEDT, Tuesday, non-2am hour) to confirm exactly one run per Sydney Monday.
- Confirm the cron job list shows the weekly Monday schedule and the monthly one is gone.
- First live run lands Monday 5 Oct at 2am Sydney; the completion email and the refreshed CSV confirm it end-to-end.
