# Notes tab on roster pages (Tixel first)

## What you get
- A third button, **Notes**, next to List and Calendar on the live roster page. It shows whenever the calendar switch is on for that roster, which you'll turn on for Tixel so the toggle appears.
- Notes shows a bullet list of the creators that are visible on the page right now. Live and archived creators are left out, and the category and status filters still apply.
- Each bullet looks like this:

```text
- Max Jackson — 1.2M total fans · 850K social followers
  Posting: Thu 2 Oct, Wed 15 Oct
  Notes: Confirmed, awaiting draft
```

- If a creator has no posting date or note, the bullet shows "Posting: TBC" and leaves the notes line out.
- A **Copy notes** button copies the whole list as plain text with the roster title and today's date. Your client can paste it into email or Slack and read it offline.
- It works in light and dark mode and on phones.

## Technical details
- `src/routes/roster.$slug.tsx`: widen `view` to `"list" | "calendar" | "notes"`, add Notes to the toggle, and render a notes list from `activeItems`.
- Totals come from `totalFans` / `socialAudience` in `src/lib/audience.ts` and are formatted with `formatCount`. Posting dates combine `posting_date` and `extra_posting_dates`, sorted and formatted with date-fns.
- Notes use the existing `vibe` text. Copy uses `navigator.clipboard.writeText` and shows a sonner toast.
- No database changes. Turn `show_calendar` on for the tixel-social roster, or you can flip it yourself in the builder.
