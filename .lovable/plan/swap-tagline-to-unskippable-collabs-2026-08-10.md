# Swap tagline to "Unskippable collabs"

The old line "Where cool collabs make real noise" survives in two places (the hero itself already says "Unskippable collabs"):

1. **Browser tab / search title** — homepage page title and social share description.
2. **Footer copyright line** — reads "© 2026 Create Racket. Cool collabs".

## Changes

- `src/routes/index.tsx` (route head):
  - title: `Create Racket — Unskippable collabs`
  - og:title: `Create Racket — Unskippable collabs`
  - og:description: `Unskippable collabs.`
- `src/components/layout/SiteFooter.tsx`: copyright line becomes `© {year} Create Racket. Unskippable collabs`.

No other files contain the old wording — other routes have their own page-specific titles and are unaffected.
