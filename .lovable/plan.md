# Grey calendar toggles

## What you'll see

The little platform pills on calendar key events (IG / TT / YT / Story / Trial) stop being
pink and become soft grey chips with dark text — in both light and dark themes, on campaign
report calendars and roster calendars alike.

Everything else about the calendar stays as it is: white event boxes with their soft outline
in light mode, the pale pink tint on event boxes in dark mode, the bright green "Preview"
pill on linked events, and the green ring on today's date.

## Steps

1. **Hand over the previews first.** Copy the five calendar mock-ups already rendered this
   session (light: current pink, soft grey, mid grey; dark: current pink, grey; plus one
   close-up of a single event box) into your Files so you can compare them side by side.
2. **Add two colour tokens** for the pills — one for the chip fill, one for its text — with a
   value per theme: soft grey fill with dark ink in light mode, a light grey fill with dark
   ink in dark mode so the labels stay readable on the dark canvas.
3. **Point the pill at the new tokens** in the shared calendar component, replacing the pink
   fill and pink-ink text it uses today.
4. **Drop the pink override** in the light-mode stylesheet that currently forces the pills
   back to brand pink, so the new tokens are what actually paints them.
5. **Leave untouched:** the green Preview pill, today's green outline, the event box outlines
   and tints, and every other pink in the app (access-code fields, the report's gradient bar,
   link text).
6. **Update the saved design note** so the calendar's documented look says grey pills rather
   than pink ones.

## Technical details

- The pills are rendered by the shared calendar component (`src/components/roster/RosterCalendar.tsx`),
  used by both the report calendar and the roster calendar, so one change covers both surfaces.
- Today's styling there is `bg-pink-accent` with `text-pink-ink` on a rounded-full span
  (class `calendar-event-tag`).
- In light mode a stylesheet rule (`.report-light .calendar-event-chip .calendar-event-tag`)
  forces the fill back to `var(--pink-accent)` with `!important`; that rule is what gets
  replaced, not the component alone.
- New tokens follow the existing pattern in `src/styles.css`: a value on `:root` and `.dark`,
  registered through `@theme inline` so utilities like `bg-event-tag` and
  `text-event-tag-ink` are generated.
- Values to be used: light fill `color-mix(in oklab, var(--foreground) 14%, var(--card))`
  (measured `oklab(0.89)`) with `var(--foreground)` text; dark fill a light grey
  (`color-mix(in oklab, var(--foreground) 78%, var(--card))`) with dark ink text, matching
  the light-mode reading of "soft grey chip, dark label".
- The event box itself (`.calendar-event-chip`) keeps its current pink border/tint utilities
  and its light-mode white-card override — only the pill changes.

## Verification

- Open the Stand Atlantic report calendar and a roster calendar in both themes; read the
  computed fill and text colour of a pill to confirm it is grey with dark ink in each theme.
- Screenshot a close-up of one event box and the full grid in both themes, and confirm the
  green Preview pill and today's green ring are unchanged.
- Confirm the build is clean, and that no other page's pink changed (the report's
  access-code fields and the gradient bar still use brand pink).
