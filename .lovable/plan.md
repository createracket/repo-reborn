# Warm the light mode with a blush background

Yes — `#fff5f5` is a good fit for light mode. Right now the light theme uses a neutral off-white canvas, which reads a bit stark next to the brand pink. Swapping the page canvas to the blush tone keeps it soft and on-brand without touching dark mode.

## Where it goes

- **Page background** — the main canvas across every light-mode page (dashboard, rosters, reports, spotlights, admin, public pages) becomes `#fff5f5`.
- **Cards stay white** — pure white cards on a blush canvas gives gentle separation, so content panels still pop.
- **Muted / secondary / accent surfaces** — retinted very slightly warm so filter chips, table stripes and input backgrounds sit in the same family rather than looking grey against blush.
- **Sidebar and popovers** — matched to the same warm family so dropdowns and menus don't flash cool grey.
- **Borders** — nudged to a warm neutral so outlines don't look blue-grey on the blush base.

Dark mode is untouched — this only affects the light theme.

## Technical detail

All changes are confined to the `:root` block in `src/styles.css`:

- `--background`: `oklch(0.972 0.012 17)` (equivalent to `#fff5f5`)
- `--card` / `--popover`: stay `oklch(1 0 0)` (white)
- `--muted`, `--secondary`, `--accent`: warm tints around `oklch(0.955 0.008 17)`
- `--sidebar`: `oklch(0.965 0.010 17)`, `--sidebar-accent` slightly deeper
- `--border` / `--input`: warm-neutral alpha values
- `--brand-light`: aligned to the blush tone

After the change I'll screenshot a light-mode page to confirm contrast is still comfortable and the green/pink brand accents still read clearly.
