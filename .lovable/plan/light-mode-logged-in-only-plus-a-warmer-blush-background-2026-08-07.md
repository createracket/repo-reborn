# Light mode: logged-in only, plus a warmer blush background

Two changes: restrict light mode to signed-in areas of the site, and soften the light canvas from stark white to `#fff5f5`.

## Scope light mode to logged-in users

- The homepage and the login/auth page always render in dark mode, regardless of the saved preference — the marketing look stays exactly as it is today.
- The sun/moon toggle is removed from the homepage hero and hidden for signed-out visitors in the shared site header.
- Signed-in users see the toggle in the header and their choice applies across the app (dashboard, rosters, reports, spotlights, admin, builders).
- Publicly shared pages (roster, report and spotlight share links opened by people without an account) also stay dark, so anything a lead sees looks consistent.
- The preference is still remembered per device and dark remains the default.

## Warmer light background

- Page canvas in light mode becomes `#fff5f5` instead of the current off-white, so it reads soft and on-brand rather than stark.
- Cards stay pure white for gentle separation against the blush canvas.
- Muted, secondary, accent and sidebar surfaces are retinted very slightly warm so chips, inputs and dropdowns sit in the same family instead of looking cool grey.
- Borders nudge to a warm neutral. Dark mode is untouched.

## Technical detail

- Colour work is confined to the `:root` block in `src/styles.css`: `--background` becomes `oklch(0.972 0.012 17)` (`#fff5f5`), `--card`/`--popover` stay white, `--muted`/`--secondary`/`--accent` around `oklch(0.955 0.008 17)`, `--sidebar` `oklch(0.965 0.010 17)`, warm-neutral `--border`/`--input`, and `--brand-light` aligned to the blush tone.
- `src/hooks/use-theme.tsx` gains a way for a route to force dark: the pre-paint init script only honours the stored light preference when the path is an app route, and the provider accepts a `forceDark` flag so the homepage and `/auth` re-apply dark on mount.
- Remove the `ThemeToggle` from `src/routes/index.tsx`; in `src/components/layout/SiteHeader.tsx` render it only when there is an authenticated session.
- Verification: screenshot a light-mode app page for contrast, and confirm the homepage and login page still render dark with a light preference saved.
