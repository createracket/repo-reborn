# Speed up the Mulberry AU roster page

## What I found

The page itself isn't heavy on data — Mulberry AU has 28 creators (15 hidden, 13 shown) and the database queries are properly indexed. The slowness comes from images and load order:

- **~3.7MB of avatar images** load at once, at full size. The biggest are 418KB, 377KB, 357KB, 260KB — all displayed in a 56px circle. Nothing is lazy-loaded, so every card's photo downloads immediately, even those far below the fold.
- **Header image is 231KB** and also loads uncompressed at full resolution.
- **Nothing loads until the browser has hydrated.** The page shows "Loading roster…", then makes two database calls one after the other (roster, then creators) before anything appears. So the wait is: page load → JavaScript → request 1 → request 2 → render → then images start.

## What to change

1. **Serve resized avatars** — request each avatar at the size it's actually shown (small square thumbnail) instead of the full upload. This alone cuts the image payload from ~3.7MB to well under 200KB.
2. **Lazy-load off-screen images** — avatars below the fold only download when scrolled to; the header image stays eager so the top of the page paints fast.
3. **Reserve image space** — explicit dimensions so cards don't jump around while photos arrive.
4. **Fetch roster and creators in parallel** rather than one after the other, removing one full round-trip from the wait.
5. **Lighter loading state** — show the page skeleton (header, title, metric cards) immediately instead of a bare "Loading roster…" line, so it feels instant even before data lands.

Applies to all roster pages, not just Mulberry.

## Technical notes

- `src/routes/roster.$slug.tsx` only; no schema or builder changes.
- Avatars are Supabase Storage public URLs; use the render/image transform endpoint (`/storage/v1/render/image/public/...?width=112&height=112&resize=cover&quality=75`) via a small helper, with a fallback to the original URL on error. Same helper applied to the header image at a wider width.
- Add `loading="lazy" decoding="async"` plus `width`/`height` to creator avatars; header image keeps `loading="eager"` with `fetchPriority="high"`.
- In the load effect, run the roster lookup and the `roster_items` query concurrently once the roster id is known — or fold both into a single request path so the gated/member branches are unaffected.
- Passcode-gated and member paths (`getRosterGate`, `unlockRoster`, `getRosterForMember`) keep their current behaviour.
