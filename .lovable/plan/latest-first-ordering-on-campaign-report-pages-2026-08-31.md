# Latest-first ordering on campaign report pages

Add recency-aware ordering to public campaign report pages, with no changes to the report builder. Admin ordering (drag positions) stays exactly as it is.

## What changes for viewers

Next to the existing platform/month filters, a small toggle appears:

- **By creator** (default): each creator keeps their own block, but blocks are ordered by that creator's most recent post, and posts inside a block run newest first.
- **Latest first**: the creator grouping flattens into one chronological feed, newest post first, with the creator's name/avatar still shown on every card.

Applies to both the Original and Simple templates. Posts with no date sort to the bottom and keep their current builder order relative to each other.

Everything else is untouched: filters, extra-mentions toggle, the "Show more" batching of 20, and all total metrics.

## Technical notes

All work is in `src/routes/report.$slug.tsx` (presentation only — no schema, no server function, no builder change):

- Add `sortMode` state (`"creator" | "latest"`), persisted only in component state.
- Derive ordering after the existing `filteredCreators` step:
  - creator mode: sort each creator's posts by `posted_at` desc (nulls last, then `position` asc), then sort creators by their newest `posted_at`.
  - latest mode: flatten `filteredCreators` into a single post+creator list sorted by `posted_at` desc (nulls last).
- Apply the existing `visibleCount` budget to whichever list is active so "Show more" keeps working in both modes.
- Original template in latest mode renders the flat list with `PostCard`; Simple template already renders a flat grid, so it just consumes the reordered list.
