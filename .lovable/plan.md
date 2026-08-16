# Slow profile saves after adding content links + fetched previews

## What I checked so far

- The save itself is a single write to your profile row. The two database triggers on that table are trivial, the access rules are simple, and **no profile save appears anywhere in the database's slowest queries** — so the write itself is not what's taking the time.
- Nothing in the save path does extra network work: link previews and auto-sync all happen when you press those buttons, not on save.
- One thing that stands out: **no profile row currently has any featured-post data stored at all** (the media field is empty on every profile, including the one updated this morning). So it's worth confirming whether your save is genuinely slow, or whether it's stalling/failing and the covers never land.

So: the cause is not yet confirmed. Step 1 of this plan is to pin it down rather than guess.

## Step 1 — Pin down where the time goes

Add temporary timing around the save on the profile editor: how long the browser waits for the write to come back, and how long the page takes to settle afterwards. Then run one real save with four links and covers filled in and read the numbers.

That separates the three candidates:
1. The network write is slow (backend/connection).
2. The write is fast but the page re-render after it is slow.
3. The write never completes / errors silently, so it just feels like it hangs.

## Step 2 — Fix what the timing shows

Likely fixes, applied only where the measurement points:

- **Heavy cover images.** Fetched previews are mirrored at full original size (up to 8MB each) and then rendered in the editor as small thumbnails with no lazy loading. Four of those in one form is a lot of image decoding on every keystroke-driven re-render. Fix: shrink mirrored covers when they're pulled in, and render editor thumbnails with lazy/async decoding and explicit sizes.
- **Form re-renders.** Each media field updates one big form object, re-rendering the whole editor including all preview images. Fix: isolate the featured-posts block so typing/saving doesn't re-render the whole page.
- **Silent failure.** If the write is erroring or timing out, surface the real error, and confirm the covers actually persist after save.

## Step 3 — Verify

Re-run the same save (four links + four fetched covers), confirm the save completes in well under a second, confirm the covers are stored, and confirm they show on your public profile page.

## Technical notes

- Editor: `src/routes/_authenticated.profile.tsx` (`handleSubmit`, `FetchPreviewButton`, `MediaUploadButton`, the Featured posts block).
- Mirroring: `src/lib/mirror-image.server.ts` currently uploads original bytes with no resize; `src/lib/campaign-scrapers.functions.ts` calls it via `mirrorOrKeep`.
- Database side is already clean: `profiles` triggers (`protect_profile_columns`, `touch_updated_at`) are cheap, RLS is a simple owner/admin check, and `pg_stat_statements` shows no slow profile upsert. No migration is expected.
