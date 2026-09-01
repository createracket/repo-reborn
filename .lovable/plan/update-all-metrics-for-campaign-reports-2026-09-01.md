# "Update all metrics" for campaign reports

Admin-only button in the report builder that re-fetches metrics for every post in a report, runs in the background, shows a live progress bar with an estimated time, and notifies you when it finishes.

## What it costs and how long it takes

For **Tixel Always-On Socials** (`/report/tixel-report`) there are 57 posts: 36 Instagram, 21 TikTok, 3 with no URL (skipped) — so 54 fetches.

- No AI/LLM tokens are involved. Metric fetching uses the scraping service (Apify), billed per result, not per token. 54 post fetches is a few cents.
- Time: each post takes roughly 10–25 seconds. Run 4 at a time and the whole report lands in about **3–5 minutes**. The estimate shown in the UI is `ceil(posts / 4) x 18s`, refined as real results come in.

## How it works for you

1. In the report builder header, next to the report title: **Update all metrics**.
2. It asks for confirmation, showing "54 posts to update — estimated 4 minutes" (3 skipped: no URL).
3. The job starts server-side. You can close the tab, keep editing, or navigate away.
4. A progress strip appears at the top of the builder while a job is running: "Updating metrics — 22/54 done, 2 failed, ~2 min left", with a Cancel button.
5. When it finishes you get a toast (if you're on the page), a summary panel listing any posts that failed with the reason, and an email to your admin address with the same summary. Both notifications are on by default and each can be turned off per run with a checkbox.
6. Anything that fails keeps its existing numbers — nothing is wiped by a failed fetch.

Only fields the scraper returns are overwritten (views, likes, comments, shares, saves, followers, posted date, caption, thumbnail where missing). Manually typed values you've entered for fields the scraper doesn't return are left alone.

## Technical notes

- New tables: `public.metric_jobs` (report_id, status, total, done, failed, started_at, finished_at, cancel_requested, notify_email, created_by) and `public.metric_job_items` (job_id, post_id, status, error). Admin-only RLS, plus the usual GRANTs; writes happen server-side.
- New `src/lib/report-metrics-jobs.functions.ts`:
  - `startMetricsJob({ reportId })` — admin check, creates job + one item per post with a URL, returns job id and estimate.
  - `getMetricsJob({ jobId | reportId })` — progress polling for the builder (2s interval while running).
  - `cancelMetricsJob({ jobId })` — sets `cancel_requested`.
- Worker: server route `src/routes/api/public/hooks/report-metrics-worker.ts`, guarded by a shared secret header. Each invocation claims up to 4 pending items for the oldest running job, calls the existing scrape helpers from `campaign-scrapers.functions.ts`, writes results to `campaign_report_posts`, updates counters, and returns. Kicked off immediately after `startMetricsJob` and repeated by a `pg_cron` job every minute until no running jobs remain — this keeps each request well inside the serverless time limit rather than one long-running call.
- Concurrency is capped at 4 in-flight fetches with a per-item timeout (60s) and one retry, so a single hanging post can't stall the job.
- Completion: when the last item resolves, the worker marks the job complete and sends the summary email through the existing `src/lib/email/send.server.ts` pipeline.
- The existing per-post "Fetch metrics" button stays exactly as it is.
- Admins are already exempt from the usage quota system, so this doesn't consume any allowance.
