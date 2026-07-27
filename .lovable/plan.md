## Goal
Make the reach figures on campaign report pages use the Reach % you enter per post, instead of a blanket 80% of views.

## Current behaviour
- **Est. reach** = total views × 0.8
- **Month reach** = month views × 0.8
- The per-post **Reach %** field (advanced fields in the report builder) is displayed on post cards but never feeds the totals.

## New behaviour
Reach is summed post by post:
- If a post has a Reach % entered → that post's reach = views × (Reach % / 100)
- If not → fall back to views × 0.8 (unchanged estimate)

Applies identically to the all-time "Est. reach" stat and the "Month reach" stat (month version uses only posts whose live date falls in the selected month).

Where any post has a real Reach %, the label changes from "Est. reach" to "Reach" so it's clear the number is partly measured; if no post has one, it stays "Est. reach".

## Technical detail
- Edit `src/routes/report.$slug.tsx` only — presentation/calculation layer, no schema or builder changes.
- Add a `computeReach(posts)` helper that reduces over posts using `reach_pct ?? 80`.
- Use it for both the totals row and the month summary row, replacing the two `Math.round(views * 0.8)` expressions.
- No database migration needed — `reach_pct` already exists on `campaign_report_posts`.
