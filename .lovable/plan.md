# Twitch / Facebook / X missing in the Spotlight builder

## What I found

The Spotlight editor in the admin panel does contain the new fields: a Twitch URL, Facebook URL and X URL input (each with a manual follower box), followed by an "Other link" block with a label + URL + follower count. They sit in the same form grid, directly after the Instagram / TikTok / YouTube / Spotify / Apple Music inputs. There is only one spotlight editing surface in the codebase, so there is no second, older form you could be looking at.

The dev server compiled these changes cleanly with no errors. What I could not do is confirm what your browser is actually rendering — the admin page needs an admin login, and there is no session available to me right now. Your preview also logged a failed module load earlier, which is the classic signature of a browser holding a half-stale bundle.

So the most likely explanations, in order:

1. Stale bundle in your browser tab (the failed module load supports this).
2. You are looking at the published site (createracket.com), which has not been republished since these fields were added.
3. A genuine render problem I cannot see without a session.

## Plan

1. First, rule out the cheap causes: hard-refresh the admin page in the preview (or open it in a fresh tab), and confirm whether the site you are on is the preview or the published one. If the fields appear, we are done and I will publish so the live site matches.
2. If they are still missing after a hard refresh in the preview, sign in to the preview as admin so an authenticated check can run against the live page. I will then drive the admin page, open a spotlight editor, and capture exactly what renders between the Apple Music input and the video/clip fields.
3. Fix whatever that check shows. The realistic failure modes are the new block being clipped by the surrounding grid/scroll container in the editor dialog, or a conditional above it short-circuiting the render for existing spotlight records.
4. Re-verify on the same spotlight you were editing (State Champs), confirm entered values save into the links JSON and survive a reload, and confirm the totals still roll into Total social audience / Total fans.

## Technical notes

- Editor component: `SpotlightForm` in `src/routes/_authenticated.admin.tsx` (fields around the social inputs block; keys `twitch`, `facebook`, `x`, `custom_label`, `custom_url`).
- Values persist into `partner_pages.links` alongside `*_extra` arrays and `follower_counts`.
- Public rendering already handles these keys in `src/routes/spotlight.$slug.tsx`.
