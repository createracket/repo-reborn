# Light mode: signed-in users only, landing page untouched

## Current state (verified)

This is already in place in the code:

- `src/hooks/use-theme.tsx` forces dark on `/`, `/auth`, `/login`, `/signup`, and only allows light when a signed-in session is detected (`canUseLight = signedIn && !isAlwaysDark(pathname)`).
- The pre-paint script applies the same rule before first render, so there's no flash of light on the landing page.
- `src/components/theme/ThemeToggle.tsx` returns `null` when `canUseLight` is false, so the Sun/Moon switch only appears for logged-in users on permitted routes.
- The toggle lives only in `SiteHeader`, not on the homepage hero.

## Remaining step

Verify in the running app rather than change code:

1. Load the landing page signed out and signed in, confirm it renders dark and shows no toggle.
2. Load `/auth` and confirm dark, no toggle.
3. Sign in, load the dashboard, confirm the Sun/Moon toggle appears and light mode applies the blush `#FFF5F5` background.
4. With light stored, reload the landing page and confirm it stays dark.

If any public route (e.g. roster, spotlight or report share pages) is showing the toggle and shouldn't, add it to the always-dark list in `use-theme.tsx` — that's the only likely code change.

## Technical notes

Single source of truth is `ALWAYS_DARK` in `src/hooks/use-theme.tsx`; it feeds both the React hook and the inlined pre-paint script, so route additions only need editing there.
