# Homepage loading speed

## Short answer

Moving the "We operate at the cultural edge…" paragraph below the email bar won't change loading time — it's plain text, effectively free. It's purely a layout/hierarchy choice. If you want it moved for design reasons, happy to do it.

The real cost on the homepage is the video marquee: 24 `<video>` elements (12 clips, duplicated) all set to `autoPlay` and loading at once, plus the logo/map/trusted-logos images.

## What actually speeds it up

1. **Lazy-start the marquee videos**
   Only autoplay clips once the marquee scrolls into view (IntersectionObserver), and pause clips that are off-screen. Nothing downloads until the section is visible.

2. **Load video sources on demand**
   Keep `preload="none"` and attach the `src` only when a clip enters the viewport, so the initial page load fetches zero video bytes.

3. **Mobile: fewer clips**
   Render 6 clips instead of 12 on small screens — same visual effect, half the network work.

4. **Poster frames**
   Show a lightweight still (or the existing gradient fallback) until a clip is ready, so the strip never looks empty.

5. **Image hygiene**
   Add `loading="lazy"` + explicit width/height to the community map and trusted-logos images; keep the hero logo eager so the top of the page paints fast.

## Optional layout change

If you do want the paragraph under the email bar, the order becomes: logo → "Unskippable collabs" → email capture → paragraph → trusted-by. This puts the call-to-action higher, which is a reasonable conversion argument even though it doesn't affect speed.

## Technical notes

All changes are confined to `src/routes/index.tsx` (`VideoMarquee` component and the hero block). No backend or data changes.
