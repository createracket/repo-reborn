# Roster page: make the status badge stand out

The status pill (e.g. "In Production") currently sits in the same top-right row as the category tags, styled in low-contrast grey so it reads as just another tag.

## What changes

- Keep the status grey (matching the reference), but give it a crisper outline and stronger text so it reads as a status, not a category.
- Move it out of the category row: the categories stay top-right, and the status pill moves to the bottom-right corner of the creator card, sitting on its own line below the social stats.

## Result

Each creator card reads: name + verified/prospect tags and fan counts on the left, category tags top-right, social stat chips below, and a single prominent grey status pill anchored bottom-right.

## Technical notes

- `src/routes/roster.$slug.tsx` only (public roster page).
- Update `STATUS_BADGE_CLASS` to a lighter border and higher-contrast foreground text on a subtle grey fill.
- Remove the status `Badge` from the category flex row (~line 521) and render it after the stats row, right-aligned, still gated on `roster.hide_statuses`.
- No changes to the status filter, data, or the admin roster builder.
