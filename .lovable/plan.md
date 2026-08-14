# Fix the TikTok sync button

I tested the TikTok lookup service directly — it is working and returns follower counts. The failures are in how we prepare the TikTok address before calling it, and in how errors are shown.

## What's wrong

1. **Anything that isn't a full `https://` TikTok link is rejected.** The roster builder and report builder send whatever is typed in the field straight through. Values like `@handle`, `tiktok.com/@handle` or `www.tiktok.com/@handle` fail the URL check and come back as "Unrecognised URL". Only the member profile page tidies the value first.
2. **Share links don't work.** Short links (`vm.tiktok.com/…`, `tiktok.com/t/…`) and links with a trailing sub-path or tracking parameters can't be reduced to a handle, so the sync gives up.
3. **Errors can vanish.** If the lookup throws (timeout, service error), the sync button just stops spinning with no message, so it looks like nothing happened.
4. **Empty result is treated as failure.** If the account has no public videos, the service can return a bare record and we report "No TikTok profile returned" even when the follower count is available.

## The fix

- Add one shared TikTok address tidier used by every sync entry point: accepts `@handle`, `handle`, `tiktok.com/@handle`, full URLs, links with query strings, and video/sub-path links, and turns them into a clean profile handle.
- Resolve short share links by following the redirect to the real profile/video URL before extracting the handle.
- Read the follower count from every field the service may use, and fall back to the second TikTok source if the first returns nothing.
- Always show a toast on failure (including thrown errors), with the reason, and stop the spinner.
- Apply the same tidying to the other platforms' sync buttons in the roster builder so behaviour is consistent (Instagram, YouTube, Twitch, Facebook, X).

## Where this shows up

- Roster builder — creator cards and the "add creator" form (both have their own copy of the fetch logic; both get fixed).
- Member profile page — monthly sync run.
- Spotlight/brief AI enrichment, which uses the same lookup.

## Technical notes

- New helper in `src/lib/campaign-scrapers.functions.ts` (server side): `normaliseProfileInput(platform, raw)` plus a hardened `extractTikTokHandle` that handles `@`-less paths, `/t/` links and query strings; short links resolved with a `HEAD`/`GET` redirect follow.
- `scrapeProfileFollowers` normalises before `detectProfilePlatform`, so a bare handle no longer fails validation.
- `scrapeTikTokProfile`: read `authorMeta.fans ?? fans ?? followerCount ?? stats.followerCount`; if the profile actor returns no usable record, retry via `clockworks~free-tiktok-scraper` on the profile URL.
- `fetchFollowers` in both roster-builder forms gets a `try/catch` around the call with `toast.error` on throw.
