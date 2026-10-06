# Auto-pull new creator posts into reports

## What you get
- A new switch in the report builder: **"Auto-add new posts daily"**, plus a **campaign start date** (and optional end date). Only posts published inside those dates are pulled in.
- Once a day (around 3am Sydney), the report checks each creator's linked channels (Instagram, TikTok, YouTube) and adds any post it hasn't seen yet, with thumbnail, caption, date and metrics.
- New posts are added straight to the live report (as you chose "every new post"), marked with a small **"Auto-added"** badge in the builder so you can spot them, and a **Remove** action that also stops that post being re-added.
- A **"Check for new posts now"** button in the builder for an instant pull.
- A short summary line in the builder: "Last checked today 3:02am · 2 new posts added".
- Off by default for every report. For Stand Atlantic Socials we switch it on and set the start date with you.

## What it needs from each creator
Each creator in the report needs their channel handles saved (e.g. @standatlantic on Instagram/TikTok). The builder will show a warning on creators with no handle, since they can't be checked.

## Costs
No AI tokens. Each daily check is one channel fetch per creator per platform on the existing social data service. For a report like Stand Atlantic (a handful of creators) that's roughly a few cents a day — about $1–3/month. Reports with the switch off cost nothing. Turning it off after the campaign end date happens automatically.

## Safety
- Never deletes or edits existing posts or your manual metrics.
- Posts you remove are remembered and never re-added.
- Existing weekly metrics refresh keeps running as now.

## Technical details
- Migration: `campaign_reports.auto_pull_posts bool default false`, `auto_pull_start date`, `auto_pull_end date`, `auto_pull_last_run timestamptz`, `auto_pull_last_result jsonb`; `campaign_report_creators.channels jsonb` (platform → handle) if `handle` alone is insufficient; `campaign_report_posts.auto_added bool default false`; new `campaign_report_dismissed_posts(report_id, post_url unique)` table. Explicit GRANTs for new columns/table (admin-only RLS).
- Unique index on `(creator_id, post_url)` for idempotent inserts.
- New `discoverCreatorPosts` server core in `campaign-scrapers` reusing the existing Apify helper (profile/latest-posts actors per platform), filtering by date window, skipping known/dismissed URLs, then running existing metric scraping on new posts.
- Daily cron hits `/api/public/hooks/report-post-discovery`, with a lease-row lock, per-run cap on creators, and the handler gated by a server-only secret since it spends Apify credit.
- Builder: switch, dates, "Check now" (admin-auth server fn), badges, remove → dismiss.
- Record the rule in AGENTS.md.
