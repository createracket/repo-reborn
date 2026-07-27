## What's happening

Two posts on the Tixel report have a metric stored as `-1`:

- Mysie — Instagram reel (`DY2mDXjuO7f`) — likes = -1
- Sabrina Solemani — Instagram reel (`DYoljdYOfQQ`) — likes = -1

Instagram hides like counts on some posts, and the scraper returns `-1` as a sentinel for "hidden". The fetch-metrics code stores that number verbatim (`likes: p.likesCount ?? null`), so it displays as -1 and also drags down the totals and engagement-rate maths.

## The fix

1. **Scraper sanitising** — in the metrics fetcher, treat any negative numeric metric (views, likes, comments, shares, saves, followers) as "unavailable" and store `null` instead of the negative sentinel. Applies to both the Instagram and TikTok paths.
2. **Display guard** — on report pages and in the report builder, render a negative or missing metric as "—" rather than a number, so bad legacy data can never show as -1.
3. **Totals guard** — exclude negative values from the summed views/likes/comments/shares/saves and from the engagement-rate calculation (they're currently treated as real numbers).
4. **Data cleanup** — set the two existing `-1` like values on the Tixel report to null, and sweep any other negative metric values across all campaign report posts to null in the same pass.

## Notes

Once cleaned, those two posts will show "—" for likes. If you want real numbers there, the like count would need to be entered manually in the report builder, since Instagram doesn't expose it publicly for those reels.
