# Light mode across the site (starting with the dashboard)

## What you'll get

A sun/moon toggle in the site header that switches between the current dark
charcoal look and a new light Create Racket theme. The choice is remembered per
device and respects your system setting the first time. Brand colours (Racket
Green, Pink, Purple) stay the same in both modes — only surfaces, text and
borders change.

Rollout is staged: dashboard first so we can tune the look, then the rest of the
app once you're happy.

## Approach

1. **Theme foundation**
   - Today the dark palette is hardcoded in `:root`. Restructure `src/styles.css`
     so `:root` holds the light palette (off-white background, charcoal text,
     soft grey cards, adjusted `--primary-foreground` so green buttons stay
     readable) and `.dark` holds the current charcoal values unchanged.
   - Existing `@custom-variant dark` and `@theme inline` mapping stay as-is, so
     every semantic token (`bg-background`, `text-muted-foreground`, etc.)
     switches automatically.
   - Tune brand utilities per mode: `.voicenotes-gradient`, `.text-gradient-racket`
     and pink/lime tints get light-mode variants so they don't wash out.

2. **Theme switching**
   - Small `ThemeProvider` + `useTheme` hook: reads `localStorage` (fallback
     `prefers-color-scheme`), applies/removes `.dark` on `<html>`.
   - Inline script in the root shell head to set the class before first paint,
     avoiding a flash of the wrong theme on load.
   - Toggle button in `SiteHeader` (and in the mobile menu sheet).

3. **Dashboard pass first**
   - Go through `_authenticated.dashboard.tsx` and its cards, replacing
     hardcoded colour classes (`text-white`, `bg-black/…`, raw hex) with
     semantic tokens, and check contrast in both modes: opportunity carousel,
     sound board tiles, roster/suggested-match lists, dotted pink banner,
     listening reports card.

4. **Then the rest**
   - Same cleanup for the remaining hardcoded-colour files: homepage,
     `brands.how-it-works`, roster pages and builder, partner page, footer,
     pricing, racket desk, admin. Public spotlight/report/roster pages keep
     their intended fixed styling where a light background would break the
     design — we'll review those case by case.

## Technical notes

- No new dependency; a ~40-line provider is enough (avoids `next-themes` SSR
  quirks with TanStack Start).
- SSR renders without a theme class; the pre-hydration inline script sets it,
  so no hydration mismatch and no flash.
- Public share pages (roster/report/spotlight passcode-gated views) will default
  to dark unless you want them theme-aware too.

## Open question

Should light mode be the default for new visitors, or should the site stay dark
by default with light as an opt-in? Current plan: dark stays the default, light
is opt-in.
