# Admin-editable Vibe Check

Add a new "Vibe Check" tab to `/admin` that lets you edit (1) the brand + musician survey questions, (2) the weighting of every scoring rule, and (3) the archetype outputs (name, description, best-for) — for both brand and artist archetypes.

## Approach

Store everything in a single Postgres row as JSONB (`vibe_check_config`), seeded from today's defaults. Code falls back to defaults when the config row is missing or a field is null, so the app never breaks if config is partially edited.

```
vibe_check_config (singleton, admin RUD only)
  id (fixed 'default'), config jsonb, updated_at
```

Shape of `config`:
```
{
  surveys: { brand: {…forms.json brand…}, musician: {…forms.json musician…} },
  archetypes: {
    artist: { loyalist: { name, description, bestFor }, … 7 total },
    brand:  { communityFirst: { name, description }, … 5 total }
  },
  weights: {
    artist: { loyalist: { "deepen_fan_engagement": 20, "connect_creators": 15, … }, … },
    brand:  { communityFirst: { "value_community": 25, … }, … }
  }
}
```

## Refactor: rule-based scoring

Today `vibe-check.ts` has ~100 hardcoded `if (…) score += N` lines. I'll restructure each archetype's scoring as a list of named rules:
```ts
const ARTIST_RULES = {
  loyalist: [
    { id: "deepen_fan_engagement", points: 20, when: (d) => d.goals?.includes("Deepen fan engagement") },
    …
  ],
  …
}
```
The runtime score sums `rule.points` (overridable from config by rule id) when `when(data)` is true. Rule logic stays in code (it references survey field names); only the **point values** are editable from admin. Same pattern for brand archetypes.

## Admin UI — new "Vibe Check" tab

Three sub-tabs:

1. **Archetypes** — for each archetype (artist x7, brand x5), text inputs for name + description (+ bestFor for artist). Side-by-side cards.
2. **Weights** — collapsible section per archetype; one numeric input per rule, with a human-readable label of the rule. Reset-to-default button per archetype.
3. **Surveys** — for each survey (brand, musician): edit section titles/descriptions and field labels/placeholders/options. Options are editable as a comma/newline list. Adding/removing fields is **not** in scope (would break scoring rules); only editing existing ones.

Single "Save changes" per tab writes the merged config back. "Reset to defaults" reverts that section.

## Consumers updated

- `OnboardingForm.tsx`: load surveys from config (server fn) instead of static `forms.json` import; fall back to JSON on error.
- `vibe-check.ts`: `calculateVibeScore` / `calculateBrandVibe` accept an optional `config` arg; archetype names/descriptions read from config; rule points read from config.
- `results.tsx`: reads archetype descriptions from config.

## Server functions

- `getVibeCheckConfig` (public) — returns merged config (defaults + overrides).
- `updateVibeCheckConfig` (admin-only via `requireSupabaseAuth` + `has_role` check) — upsert single row.

## Out of scope

- Adding/removing survey fields or archetypes (rule logic is tied to field names + archetype keys).
- Editing the rule **logic** (only point values).
- Versioning/history of edits (single live config).

## Plan of work

1. Migration: create `vibe_check_config` table + RLS + GRANTs.
2. Refactor `src/lib/vibe-check.ts` into rule lists + defaults export.
3. Add `src/lib/vibe-check-config.functions.ts` (get + update server fns).
4. Wire `OnboardingForm` and `results.tsx` to read from config.
5. Build the new admin tab (`Archetypes`, `Weights`, `Surveys` sub-tabs).
