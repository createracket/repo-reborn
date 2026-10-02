# Request in-platform stats from creators

## What you'll get

On the report builder (detailed "original" template), each post gets a **Request stats** button. It opens a small panel where you:

1. Enter or confirm the creator's email (saved on the creator so you only type it once).
2. Tick which stats you need: reach, impressions/views, watch time, saves, shares, profile visits, audience split (top countries / age), plus an optional screenshot.
3. Edit a short pre-filled intro message (creator name, campaign, post link already filled in).
4. Click **Send request** — or **Copy link** if you'd rather send it from your own inbox/DMs.

The creator receives an email from Racket with the post link and a big **Share my stats** button. That opens a simple, no-login page showing the post thumbnail and only the fields you asked for, with an optional screenshot upload (images up to 10MB). One submission per link; they can re-open and correct it until you mark it reviewed.

Back in the builder, each post shows a status chip: **Requested · Viewed · Submitted**. Submitted numbers appear side by side with current values and you click **Apply** to copy them into the post (nothing overwrites automatically). The screenshot is viewable from the same panel.

## Technical details

- New table `post_stats_requests` (id, token, report_id, post_id, creator_id, email, requested_fields text[], message, status requested|viewed|submitted|applied, answers jsonb, screenshot_path, sent_at, submitted_at, created_by). GRANTs + RLS: admins/report owners full access; no anon access (public page goes through token-gated server fns using the admin client, same pattern as talent forms).
- Add `email` column to `campaign_report_creators` (admin-only select, consistent with restricted email columns).
- New public route `/stats/$token` (noindex) + server fns `getStatsRequest`, `submitStatsRequest` (zod-validated, token must be pending, marks viewed on open). Screenshot stored in a private storage bucket, viewed by admin via signed URL.
- New app email template `stats-request` (one recipient per request, idempotency key `stats-request-<id>`), sent from an authenticated server fn after the request row is created. Uses existing send helper; Racket branding.
- Builder UI: button + dialog + status chip in the post editor of `_authenticated.campaign-reports.tsx`; "Apply" maps answers onto `campaign_report_posts` fields (views, reach_pct, watch_time_hours, saves, shares, etc.).
- Optional notification: email to you when a creator submits (reuses existing admin notify pattern).
