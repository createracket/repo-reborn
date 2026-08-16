# Thumbnail framing controls for brief & spotlight cards

Square logos (like the Tixel mark) currently get cropped by the 16:9 dashboard tile. This adds per-page controls so you can decide how the image sits in the tile.

## What you get

In the brief/spotlight builder, inside the existing **Images** dropdown, a new "Dashboard thumbnail" block with:

- **Fit** — Fill (current crop behaviour) or Fit whole image (nothing cropped, letterboxed).
- **Background** — Black, White, or Card default. Used for the letterbox space when fitting.
- **Zoom** — slider from 50% to 150% so you can pull a square logo back or push it in.
- **Vertical position** — Top / Centre / Bottom, so cropped images can favour a region.
- **Live preview** — a 16:9 tile that renders exactly as the dashboard card will, updating as you drag.

Defaults stay exactly as today (fill, top-anchored, card background), so no existing page changes look.

## Where the settings apply

- Featured spotlights carousel tile on the dashboard
- Brief tile in the Project planner
- Both brief and spotlight pages use the same builder, so it works for either section

The brief/spotlight page hero image itself is unchanged — this is thumbnail framing only.

## Technical notes

- Settings persist in the existing `partner_pages.links` JSONB as `links.thumb_frame = { fit, bg, zoom, position }`. No migration needed.
- A small shared helper (e.g. `src/lib/thumb-frame.ts`) turns that object into the wrapper background class plus the `<img>` `object-fit` / `object-position` / `transform: scale()` styles, so the builder preview and the dashboard tiles render identically.
- `src/routes/_authenticated.dashboard.tsx` adds `links` to the `partner_pages` select and pipes each row through the helper for both tile renderers.
- `SpotlightForm` in `src/routes/_authenticated.admin.tsx` gains the controls and writes `thumb_frame` in its existing `links` save payload.
