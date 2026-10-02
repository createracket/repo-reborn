# Hide the follower total on the advanced talent form

## Why

The advanced talent form's AI preview shows a "{number} followers" chip. That number is the AI draft's scraped social total — it only counts the platforms that happened to scrape successfully that run (e.g. Instagram fails or the artist has no TikTok, and those silently count as zero), so it can badly under-count. The user wants it not shown. The "monthly listeners" chip stays — that comes straight from Spotify and is reliable.

## Changes

1. **Advanced form preview** (`src/routes/talent.$token.tsx`)
   - Remove the "{fmt} followers" chip from the draft preview hero (keep the "monthly listeners" chip).
   - Leave `total_followers` out of the payload the form sends on submit.

2. **Submission** (`src/lib/talent-intake.functions.ts`)
   - When an advanced submission creates the draft spotlight page, save `total_followers: null` instead of the scraped total (the AI-draft value arrives via `answers.draft`), so the incomplete number never reaches the published spotlight page's "Total social audience" metric.
   - Keep `monthly_streams` as-is.

3. **Admin builder untouched**
   - Admins can still set a real follower total themselves — the existing "Fetch followers" enrichment and the manual "Total followers" input keep working, and only the admin's own verified numbers will show on the live page.

## Verification

- Typecheck clean.
- Open an advanced talent-form link in the browser, run "Draft with AI", and confirm the preview shows the monthly-listeners chip but no follower chip; submit and confirm the created draft page has no "Total social audience" value until the admin fills one in.
