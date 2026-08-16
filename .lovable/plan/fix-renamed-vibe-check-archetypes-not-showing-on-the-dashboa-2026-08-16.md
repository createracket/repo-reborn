# Fix: renamed Vibe Check archetypes not showing on the dashboard

## What's actually broken

Your renamed archetype names are saved correctly in the Vibe Check admin config. The problem is that two places never read that config — they read the hard-coded original names:

1. **Dashboard "Your Vibe" card** (`src/routes/_authenticated.dashboard.tsx`) calls the scoring functions without passing the admin config, so they fall back to the built-in default names and descriptions.
2. **Brief builder archetype pickers** (`src/components/admin/BriefsManager.tsx`) list options from the built-in defaults, so the tick-boxes still show the old names.

There is a second, related issue: archetypes are stored on briefs as **display names**, not stable keys. So briefs saved before the rename hold the old name, and the dashboard visibility filter compares name-to-name — after a rename those no longer match, and matching opportunities can silently disappear.

## The fix

**1. Dashboard reads the live config**
Load the Vibe Check config on the dashboard (same pattern already used on the results page: `loadVibeCheckConfig()` into state, defaults until it resolves) and pass it into `calculateVibeScore`, `calculateBrandVibe` and `getArtistArchetypeDescription`. The card then shows your renamed archetype and its updated description.

**2. Brief pickers read the live config**
Build the archetype checkbox options from the loaded config instead of the built-in defaults, so the brief builder shows the current names.

**3. Rename-proof matching**
Add a small helper that resolves any stored archetype string to its stable key by checking both the current config names and the original default names. The dashboard visibility filter compares keys instead of raw strings, so briefs saved under an old name keep matching after a rename. New saves store the archetype key, with the label shown from config.

## Technical notes

- New helpers in `src/lib/vibe-check-config.ts`: `artistArchetypeKeyFromLabel(label, config)` and `brandArchetypeKeyFromLabel(label, config)`, matching case-insensitively against config names then `DEFAULT_ARTIST_ARCHETYPES` / `DEFAULT_BRAND_ARCHETYPES` names, and accepting a raw key.
- `src/routes/_authenticated.dashboard.tsx`: add config state; use it in the opportunity archetype filter (lines ~397-421) and the Vibe card (lines ~1415-1424).
- `src/components/admin/BriefsManager.tsx`: derive `ARTIST_ARCHETYPE_OPTIONS` / `BRAND_ARCHETYPE_OPTIONS` from the loaded config; store keys on save while keeping existing name values readable via the resolver.
- No database migration needed — existing `artist_archetypes` / `brand_archetypes` values stay valid because the resolver handles both names and keys.
