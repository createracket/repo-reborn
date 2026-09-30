# Second engagement rate option: "ER by interactions" (no views)

## The recommended calculation

**(likes + comments + shares + saves) ÷ followers × 100**

This is the standard industry engagement rate, used by Instagram and TikTok tools and most agencies. It only counts actions people actively take on the post. Views are left out because they're passive and would push the rate far higher than normal. That's why the current "ER by views" figures often come out very high.

Typical benchmarks for comparison: 1–3% is solid on Instagram, and 3–6%+ is solid on TikTok. If a post has no shares or saves recorded, those count as zero, so the result is just likes + comments.

## What changes in the post editor

- A second button, **ER by interactions**, sits next to the existing **ER by views**.
- Under each button you see the formula and a live preview of the result, e.g. "(likes + comments + shares + saves) ÷ followers = 2.4%".
- Clicking it saves that value as the post's ER %, the same way the current button does.
- The existing "ER by views" button stays exactly as it is.
- Nothing changes on the shared report page. It still shows whichever ER % was saved for each post.

## Technical notes

- Only `src/routes/_authenticated.campaign-reports.tsx` changes: add an `erByInteractions` calculation using the form's likes, comments, shares and saves (missing values count as 0) plus an `applyErByInteractions()` that mirrors `applyErByViews()`, and render the second button and its formula hint.
- No database changes.
