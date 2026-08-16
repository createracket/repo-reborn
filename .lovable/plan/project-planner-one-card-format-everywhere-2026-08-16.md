# Project planner: one card format everywhere

## Where thumbnails are uploaded today

| Planner card | Where you upload the image |
| --- | --- |
| Brief (Tixel-style, `/brief/<slug>`) | Admin → Briefs → the page's **Images** dropdown ("Profile image" + Dashboard thumbnail framing) |
| Campaign brief (Admin → Campaign builder list) | Admin → Briefs manager → Edit brief → **Thumbnail** block |
| Roster | Admin → Roster builder → **Thumbnail image** (square image, under the roster title/notes) |
| Campaign report | Admin → Campaign reports → **Thumbnail image** field in the report settings |

So the uploads already exist for all four — what's missing is the framing controls (zoom / background / fit) that the Tixel brief has, plus a preview that shows exactly how the tile will look.

## What this sweep changes

1. **Same framing controls on every card type.** The "Dashboard thumbnail" block (Fit, Background, Zoom, Vertical position, live 1:1 preview) currently only exists on brief/spotlight pages. It gets added next to the thumbnail upload in:
   - Campaign briefs (Briefs manager edit dialog)
   - Roster builder
   - Campaign reports builder

2. **Identical preview.** Each builder shows the exact planner tile (same component the dashboard renders), so what you set is what you get.

3. **Consistent tile rendering.** All planner tiles — briefs for you, your briefs, rosters, reports — render through the single `PlannerTile` component with the saved framing applied. Fallback order stays: square thumbnail → header image → lettered placeholder.

4. **Clear empty state.** Cards with no thumbnail show a subtle "Add thumbnail" hint in the admin views (not on the user dashboard) so it's obvious which items still need an image.

5. **Privacy unchanged.** Images stay in the existing buckets, tiles only render inside the signed-in dashboard, and brief/roster/report pages keep `noindex, nofollow` plus their access-code gating.

## Technical notes

- Framing settings for brief/spotlight pages already live in `partner_pages.links.thumb_frame`. For the other three, add a `thumb_frame jsonb` column (nullable, defaults to the current behaviour) to `public.campaign_briefs`, `public.rosters`, and `public.campaign_reports`, plus the matching GRANTs. Existing rows read as the default frame, so nothing changes visually until you adjust it.
- `get_assigned_rosters()` and `get_assigned_campaign_reports()` gain `thumb_frame` in their return so the dashboard can apply it for assigned client users.
- Reuse `src/components/admin/ThumbFrameControls.tsx` and `src/lib/thumb-frame.ts` as-is in the three builders; no new framing logic.
- `src/routes/_authenticated.dashboard.tsx` reads `thumb_frame` per row and passes it into `PlannerTile`.
