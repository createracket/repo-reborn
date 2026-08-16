# Square thumbnails across the Project planner

Right now only brief pages show a 1:1 tile in the Project planner. Submitted briefs, campaign rosters and campaign reports render as plain text rows. This brings them all onto the same tile format.

## What changes

1. **One tile format everywhere in the planner**
   - Every planner item (brief page, your submitted brief, campaign roster, campaign report) uses the same card: 1:1 thumbnail on the left, title + sub-line on the right, status/label chip underneath — matching the brief tile you already have.
   - The same "Dashboard thumbnail" framing settings (fit / background / zoom / position) apply, so a square logo on a black background looks identical across all of them.

2. **Where each thumbnail comes from**
   - Brief and spotlight pages: unchanged (profile image, then header image).
   - Campaign rosters and campaign reports: use the existing **profile image** on the roster/report; fall back to the header image.
   - Submitted briefs (the ones users send through /connect): no image exists today, so a new **thumbnail upload** is added.

3. **New thumbnail inputs where one is missing**
   - Campaign builder (admin brief editor): a square thumbnail upload with the same crop/zoom preview used on brief pages.
   - Roster builder and report builder already have a profile image field; they gain the same 1:1 preview so you can see how the planner tile will look.
   - Where no image is set, the tile falls back to a neat lettered/label placeholder rather than a broken box.

4. **Privacy**
   - Uploads keep going to the existing image storage used for spotlight/brief images. Filenames stay unguessable, the planner itself sits behind login, and `/dashboard`, `/roster/`, `/report/`, `/spotlight/` stay disallowed in robots.txt with `noindex, nofollow` on the pages, so none of these tiles or their pages get indexed.

## Technical notes

- Migration: add `thumbnail_url text` to `public.campaign_briefs`; extend `get_assigned_rosters()` and `get_assigned_campaign_reports()` to also return `profile_image_url` (and keep existing grants/security definer settings).
- New shared component `src/components/dashboard/PlannerTile.tsx` wrapping the current brief-tile markup, driven by `readThumbFrame` / `thumbFrameBgClass` / `thumbFrameImgStyle` from `src/lib/thumb-frame.ts`.
- `src/routes/_authenticated.dashboard.tsx`: select `thumbnail_url` on the "my briefs" query, read the new RPC columns, and render all four planner lists through `PlannerTile`.
- `src/components/admin/BriefsManager.tsx`: thumbnail upload (reusing the spotlight image upload path in `src/lib/spotlight-images.functions.ts`) plus a 1:1 preview.
- Roster/report builders: add the same 1:1 preview next to the existing `profile_image_url` field; no schema change needed there.
