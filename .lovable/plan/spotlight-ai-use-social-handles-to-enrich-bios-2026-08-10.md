# Spotlight AI: use social handles to enrich bios

## Recommendation

Do both, in one step. Keep the info dump as the primary source, and add an optional set of social handle/URL fields that get **fetched first** and folded into the AI prompt as extra factual context.

Reason: pasting bare handles into the text box gives the model a string with no meaning behind it — it can only echo the handle or guess. Fetching the public profile first turns a handle into real material (display name, profile bio text, follower counts, recent post captions, Spotify genres/top tracks), which is exactly the kind of grounding that makes the generated `host_bio`, `audience_segments` and `intro` specific rather than generic.

## How it works

```text
Admin pastes email/info dump
        +
Admin pastes handles (IG / TikTok / YouTube / X / Twitch / Spotify)
        |
        v
  Enrich step: fetch public profile data for each handle
        |
        v
  AI draft prompt = info dump + "Verified social data" block
        |
        v
  Draft fields (headline, intro, host_bio, audience_segments, links, metrics)
```

1. **Handles panel** — in the spotlight builder AI section, add compact inputs for Instagram, TikTok, YouTube, X, Twitch and Spotify above the existing info-dump textarea. Accept `@handle` or a full URL.
2. **Enrich before drafting** — on "Draft spotlight", each supplied handle is resolved via the existing profile scrapers, returning display name, bio text where available, follower counts, avatar, and for Spotify the artist name, monthly listeners and genres.
3. **Fed to the AI as a separate, trusted block** — the prompt gets a clearly labelled "Verified social data" section, and the drafting rules are extended: prefer this data over anything inferred, never contradict it, still never invent facts absent from both sources.
4. **Auto-fill beyond the bio** — the enrich step also pre-populates the spotlight's social link fields, follower/streaming metrics and profile image, so those no longer need manual entry.
5. **Graceful degradation** — a handle that fails to fetch is reported inline ("couldn't read TikTok") and drafting continues with whatever succeeded. Handles alone with no info dump is allowed; the current 40-character minimum on the text only applies when no handles are given.

## Technical notes

- `src/lib/spotlight-draft.functions.ts`: extend the input schema with an optional `socials` object, call the existing scraper cores (`scrapeProfileFollowers` logic, `spotifyArtistCore`, `scrapeAppleMusicArtist`) server-side inside the handler, append a "Verified social data" block to `userContent`, and extend `SYSTEM` with the precedence rule. Return the fetched metrics alongside `draft` so the UI can apply them.
- `src/routes/_authenticated.admin.tsx` (around the existing AI draft block, ~line 1376): add the handle inputs, pass them to `draftSpotlightFromText`, and apply returned links/metrics/avatar to the spotlight form alongside the text fields.
- Quota: still one `spotlight_draft` consumption per draft — the enrich fetches are free scrapes, so no change to metering.
- British English rules in the system prompt stay as-is.

## Not included

- No scraping of full post history or comment sentiment here — that lives in Racket Desk social listening.
- No automatic re-sync of spotlight metrics on a schedule; this is a one-off draft-time fetch.
