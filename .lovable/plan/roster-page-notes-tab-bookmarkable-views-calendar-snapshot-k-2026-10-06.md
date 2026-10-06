# Roster page: Notes tab, bookmarkable views, calendar snapshot & key events (Tixel first)

## What you get

**Notes tab (next to List / Calendar)**
- A third button, **Notes**, on the live roster page. It appears whenever the calendar switch is on for that roster.
- Notes shows a bullet list of the creators visible right now — live and archived creators are left out, and the category/status filters still apply.
- Each bullet shows name, category (e.g. UGC / Artist), total fans, total social followers, posting dates and the creator's existing notes text:

```text
- Max Jackson — UGC — 1.2M total fans · 850K social
  Posting: Thu 2 Oct, Wed 15 Oct
  Notes: Confirmed, awaiting draft
```

- Missing bits are skipped ("Posting: TBC" when there's no date).
- A **Copy notes** button copies the whole list (with roster title and date) as plain text for pasting into email or Slack — easy to use offline.

**Bookmarkable views**
- Calendar and Notes each get their own address, so a bookmark opens straight into that view:
  - `/roster/tixel-social?view=calendar`
  - `/roster/tixel-social?view=notes`
- The plain link still opens the usual list. Bookmarks also keep working through the access-code screen.

**Snapshot button (calendar view only)**
- A **Download snapshot** button renders the current month as a square (~1080×1080) PNG and saves it straight to the desktop — compact file, ready to drop into an email or deck. Works in light and dark mode.

**Key events (calendar view only)**
- In the roster builder, a new **Key events** section: add any number of events, each with a date and a label (e.g. "Single announcement", "Tixel campaign live").
- Events show on the calendar on their date, styled differently from creator chips, so uncovered moments are visible at a glance. Events ignore the creator filters, so they always show.

## Rollout
1. Database support, then the page changes.
2. Build and check list / calendar / notes on desktop and phone, light and dark.
3. Turn the calendar switch on for the Tixel roster and add a couple of key events so you can see it working. Any other roster can use the same switch.

## Technical details
- Database (one migration):
  - `ALTER TABLE public.rosters ADD COLUMN calendar_events jsonb NOT NULL DEFAULT '[]';` plus `GRANT SELECT (calendar_events), UPDATE (calendar_events) ON public.rosters TO authenticated;` (rosters has column-level grants).
  - `CREATE OR REPLACE` the `get_public_roster` security-definer function so it also returns `calendar_events` (keep anon/authenticated execute as-is).
- `src/routes/roster.$slug.tsx`:
  - Read the view from the URL search param (`?view=`) instead of local state only; the List/Calendar/Notes toggle updates the address so views are bookmarkable and shareable.
  - Notes view: build bullets from the same filtered `activeItems` used elsewhere, using `totalFans`/`socialAudience` from `src/lib/audience.ts`, `formatCount` for numbers, and `vibe` as the notes text. Copy via `navigator.clipboard` + sonner toast.
  - Snapshot: add the lightweight `html-to-image` package; render an off-screen square (1080×1080) copy of the month grid using the same component, export with `toPng`, and trigger a browser download. No server involvement.
  - Calendar view: render `calendar_events` on their dates with a distinct chip style.
- `src/routes/_authenticated.roster-builder.tsx`: a Key events editor (date + label rows, add/remove) saving to `rosters.calendar_events`, alongside the existing settings; posting dates already exist per creator.
- No changes to totals, sharing, or access rules.
