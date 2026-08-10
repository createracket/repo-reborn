# Day view for Traffic

Add a "24 hours" option alongside 7 / 30 / 90 days in the Traffic tab, showing a rolling last-24-hours view broken down by hour.

## What you'll see

- A new "24 hours" button in the range switcher.
- All existing panels (totals, top pages, referrers, countries, bots, self-exclusion toggle) work exactly the same, just scoped to the last 24 hours.
- The "Daily activity" chart becomes an hourly chart when 24h is selected: 24 bars, one per hour, labelled in your local time (Sydney), e.g. `2pm`, `3pm`. Title switches to "Hourly activity".

Rolling last 24 hours rather than midnight-to-now, so the view is never near-empty first thing in the morning.

## Technical notes

- `src/lib/traffic-admin.functions.ts`
  - Extend `TrafficRange` with `"24h"`; window = `Date.now() - 24h`.
  - Add a `tzOffsetMinutes` input (sent from the browser) so hour buckets align to local time.
  - Bucket into 24 hourly keys instead of day keys when range is `24h`; reuse the same `daily` array shape with an added `granularity: "hour" | "day"` field on `TrafficStats` and an ISO timestamp per bucket.
- `src/components/admin/TrafficAdmin.tsx`
  - Add the `24h` range option, pass `tzOffsetMinutes` from `new Date().getTimezoneOffset()`.
  - `DailyChart` formats labels by granularity (hour-of-day vs date) and the card title/subtitle follow suit.

No database or schema changes.
