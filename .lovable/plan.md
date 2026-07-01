
## Overview

Add a "Campaign Reports" feature that mirrors the roster-builder pattern. Reports live at `/campaign-reports` (builder, auth-only) and `/report/:slug` (public shareable page). Each report has creators, each creator has one or more "live posts" (IG / TT / YT URLs) with rich metrics that can be pasted in manually **or** auto-scraped via a third-party API.

## Third-party plugin required

To auto-pull metrics from arbitrary Instagram / TikTok / YouTube URLs (without every creator connecting their account via OAuth), we need a paid scraper. My recommendation:

**Apify** — pay-as-you-go (~$5-49/mo depending on volume), single API key, and they maintain actively-updated actors for all three platforms:
- `apify/instagram-post-scraper` — Reels/posts (views, likes, comments, caption, hashtags, top comments)
- `clockworks/free-tiktok-scraper` — TikTok videos (plays, likes, comments, shares, saves, caption)
- YouTube — we use the free official **YouTube Data API v3** (Google API key, free 10k units/day) since it's fully public and more reliable than any scraper

Alternative if you'd rather one vendor: **EnsembleData** (~$30/mo, unified API across IG/TT/YT). Let me know if you prefer that — same architecture, just different endpoint calls.

You'd need to sign up at apify.com and console.cloud.google.com to grab the two API keys. I'll request them via secure prompts when we're at that step.

**What scrapers can NOT get** (must stay manual on your side):
- Reach %, ER %, interaction %, watch time — these come from the creator's own analytics dashboard, never public
- Sentiment score — you'll set this via slider

## Data model

**`campaign_reports`** — mirrors `rosters`
- `title`, `description`, `slug` (unique), `published`, `published_at`
- `header_image_url`, `client_email`, `brand_email`
- `source_roster_id` (nullable FK → seeds creators from a roster)
- `owner_id` (auth.uid)

**`campaign_report_creators`** — one row per creator on the report
- `report_id` FK, `name`, `handle`, `avatar_url`, `position`

**`campaign_report_posts`** — one row per live post (a creator can have many)
- `creator_id` FK, `platform` (ig/tt/yt), `post_url`, `thumbnail_url`, `caption`, `posted_at`
- Auto-scrapable: `views`, `likes`, `comments`, `shares`, `saves`
- Manual: `reach_pct`, `engagement_rate_pct`, `interaction_pct`, `watch_time_hours`
- Manual: `sentiment_score` (0-100), `featured_comments` (jsonb array of {handle, avatar, text, meta})
- Manual: `brand_tag`, `hashtags` (text[])
- `metrics_updated_at`, `position`

RLS: owner-only writes; public SELECT on published reports (excludes email columns), same pattern as rosters. Anon-safe columns only.

## Scraper backend

Three server functions in `src/lib/campaign-scrapers.functions.ts`:

- `scrapeInstagramPost(url)` — calls Apify sync API, maps response to our schema
- `scrapeTikTokPost(url)` — calls Apify sync API
- `scrapeYouTubeVideo(url)` — extracts video ID, calls YouTube Data API v3 `videos?part=statistics,snippet`
- `refreshPostMetrics({ post_id })` — dispatches to the right scraper based on `platform`, updates the row, returns fresh values

All three are auth-gated (`requireSupabaseAuth`). API keys read from `process.env` inside handlers. Errors are caught and returned as `{ ok: false, error }` so the UI can show "couldn't fetch, enter manually".

## UI: `/campaign-reports` (builder, `_authenticated`)

- List of reports on the left, editor on the right (same shape as roster-builder)
- Report details card: title, description, slug, header image, client/brand email, publish toggle, "Seed from roster" dropdown
- Creators list: drag-to-reorder, each creator expands to show their posts
- Per-post editor panel modeled on your screenshot:
  - Post URL input + platform auto-detected + "🔄 Refresh metrics" button (calls scraper)
  - Thumbnail preview
  - Core metrics grid (views/likes/comments/shares/saves) — editable, auto-filled by scraper
  - Advanced metrics grid (reach %, ER %, interaction %, watch time) — manual
  - Sentiment slider 0-100
  - Featured comments repeater (up to 3, with handle, avatar URL, text, meta)
  - Caption, post date, hashtags (comma-separated), brand tag
- Sticky totals footer: aggregate views / likes / comments / total engagement across all posts

## UI: `/report/$slug` (public)

- Header image (16:9) + report title + description
- Campaign totals card at top: total views, total engagement, avg ER%, post count
- Per-post cards laid out like your mockup:
  - Left column: thumbnail + featured comments strip
  - Right column: @handle + platform icon + link out, 3×3 metric grid, sentiment bar, caption/date/hashtags/brand tag
- Uses only anon-safe columns (no emails, no owner_id)

## Dashboard integration

Extend `_authenticated.dashboard.tsx`'s "assigned rosters" section to also show reports assigned to the user's email via `client_email` / `brand_email`.

## Files

Migrations:
- 1× migration for `campaign_reports`, `campaign_report_creators`, `campaign_report_posts` + RLS + GRANTs

New files:
- `src/lib/campaign-scrapers.functions.ts` — scraper server fns
- `src/lib/youtube-utils.ts` — video ID extraction, count formatting
- `src/routes/_authenticated.campaign-reports.tsx` — builder
- `src/routes/report.$slug.tsx` — public page

Edited files:
- `src/routes/_authenticated.dashboard.tsx` — show assigned reports
- `src/components/layout/SiteHeader.tsx` — nav link to `/campaign-reports` (if roster-builder is linked there)

## Technical notes

- Scraper calls go through Apify's "run-sync-get-dataset-items" endpoint (returns results in-process, no polling required for single-URL runs, ~10-30s response time)
- Show a spinner on the "Refresh" button while scraping; toast on success/failure
- Cache scraper results implicitly via `metrics_updated_at` — user decides when to re-fetch
- YouTube Data API is quota-limited (10k units/day free, ~1 unit per video lookup) — plenty for normal use

## Secrets required (I'll prompt when ready)

- `APIFY_API_TOKEN` — from apify.com console
- `YOUTUBE_DATA_API_KEY` — from Google Cloud Console (enable YouTube Data API v3)

## Rough scope

- Migration + RLS: small
- Scraper server fns: medium
- Builder page: large (biggest piece — lots of per-post fields)
- Public page: medium
- Dashboard tweak: tiny

Suggest building in this order: migration → public page skeleton with dummy data → builder → scrapers last (so the UI works fully with manual entry even before API keys are added).
