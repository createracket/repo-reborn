# Slicker "Watch" clips on spotlight pages

Replace the raw Instagram/TikTok embeds in the Watch section with our own card design, so the section reads as part of the site instead of a social plug-in.

## What changes

- Each clip becomes a 9:16 card showing only the video artwork — no likes bar, no "View more on Instagram", no platform icons.
- Our own overlay, following the chosen "Integrated media grid" direction:
  - a small pink pill in the top-left for the platform / label (e.g. INSTAGRAM, TIKTOK)
  - a centred glass play button that turns brand green on hover
  - a bottom gradient with the caption/handle in site typography and a green "WATCH NOW" micro-label
  - subtle image zoom and pink border glow on hover
- Clicking a card opens the real post in a new tab (the platform still owns playback, so nothing breaks and nothing extra loads).
- Cards keep the existing three-across desktop grid, stacking on mobile.

## Where the artwork comes from

Instagram's public thumbnail endpoint is no longer reliable, so covers come from, in order:

1. A cover image URL you set per clip in the Spotlight editor (new small field next to each of the three video links).
2. The platform's own oEmbed thumbnail where it is available (TikTok provides this).
3. The existing violet-to-pink gradient fallback, so a card is never blank.

## Optional inline playback

Kept simple: the card stays a poster until clicked. If you'd rather it plays in place, we can swap the poster for the cropped embed on click as a follow-up — that keeps pages fast because no embed loads until someone asks for it.

## Technical notes

- `src/routes/spotlight.$slug.tsx`: rewrite the Watch section to render the new card component instead of always-mounted iframes.
- New `src/components/spotlight/ClipCard.tsx` holding the card markup, using semantic tokens (`bg-card`, `text-primary`, pink accent) rather than hardcoded hex.
- `src/lib/social-embed.ts`: extend the parser to also return a poster URL when one is known, and keep the existing embed src for the optional click-to-play path.
- Spotlight editor in `src/routes/_authenticated.admin.tsx`: add a "Cover image URL" input per video slot, stored in the existing `links` JSON (`video1_cover`, etc.), so no migration is needed.
- Loading benefit: three third-party iframes per page drop to three images.
