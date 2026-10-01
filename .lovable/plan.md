# CSV download for campaign reports (starting with Tixel)

## Can the client's dashboard pull it monthly?
Yes, but it shouldn't crawl the page itself. The report page builds its content in the browser, so a crawler gets patchy results and breaks whenever the design changes. Instead each report gets a **stable CSV address** the dashboard can fetch directly, e.g.

`https://createracket.com/report/tixel-report/metrics.csv`

The CSV only works for published reports. Reports protected by an access code need a private key added to the address (`?key=...`). We give that key to the client and can reset it at any time.

## What visitors see
- A neat **Download CSV** button in the report header, next to the light/dark toggle. It downloads `tixel-report-metrics-2026-10.csv`.
- A small "Last updated 1 Oct 2026" note beside it, so everyone knows how fresh the numbers are.

## CSV contents (one row per post)
Report, creator, handle, platform, post URL, posted date, views, likes, comments, shares, saves, followers, engagement rate, metrics last updated. Extra mentions are included, with a column marking them. Totals are left to the client's dashboard so the file stays clean to import.

## Fresh metrics before export
- A monthly automatic refresh runs **"Update all metrics"** for each chosen report on the 1st of every month at 2am Sydney time. It takes about 5 minutes for Tixel.
- The client's dashboard fetches the CSV any time after about 6am on the 1st and gets that month's numbers. We'll tell them the timing.
- Report builder: a new admin switch, **"Refresh metrics monthly"**, turned on for Tixel. When each run finishes, you get the usual completion email.
- Downloading the CSV never triggers a scrape. That keeps costs predictable and stops repeated crawls from using up scraping credit.
- Posts that fail to refresh keep their last numbers. The "metrics last updated" column shows which ones are stale.

## Technical details
- New public server route `src/routes/report.$slug.metrics[.]csv.ts` (GET). It reads the report through the server's anonymous client, using the same rules as `public_campaign_reports` (published, no access code). If a `key` is passed, it checks it against a new `campaign_reports.csv_key` column with the admin client. It returns `text/csv; charset=utf-8` with `Content-Disposition` and a short cache header. Email columns are never selected.
- Columns added to `campaign_reports`: `auto_refresh_monthly boolean default false` and `csv_key text` (no grant to anon). Column grants are added for authenticated admin users.
- Monthly refresh: a new route `api/public/hooks/monthly-report-refresh` checks a secret header (the same pattern as scheduled emails). It creates a metric job for each report with `auto_refresh_monthly` turned on. The existing worker chain then processes them. A pg_cron job runs at `0 16 L * *` UTC (2am AEST on the 1st), plus an AEDT variant. The completion email goes to the report owner.
- The Download button links to the CSV address. No extra code in the browser.
- Tixel: turn on `auto_refresh_monthly`, then run one test export and check the rows against the page.
