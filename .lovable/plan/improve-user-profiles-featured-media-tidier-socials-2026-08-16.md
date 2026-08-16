# Improve user profiles: featured media + tidier socials

Bring a light version of the spotlight layout to user profiles: featured videos and featured photos, plus a collapsible socials section in the profile builder so the form stays neat.

## What changes for users

**Profile builder (`/profile`)**
- New collapsible "Socials & links" dropdown holding all the existing social inputs (Instagram, TikTok, Spotify, Apple Music, YouTube, Twitch, Facebook, X, other link, website) plus the sync buttons. Collapsed by default once at least one link is filled in.
- New collapsible "Featured videos" section: up to four TikTok or Instagram URLs, each with an optional cover image upload — same behaviour as spotlight pages.
- New collapsible "Featured photos" section: up to four 4:5 images with upload buttons.
- Key metrics, bio, photo and audience fields stay where they are.

**Public profile (`/u/<slug>`)**
- Below the bio/socials and metrics, a "Watch" row of featured videos (same clip cards as spotlights, 2 per row on mobile when there are four) and a "Gallery" row of 4:5 featured photos.
- Sections only render when populated. Profiles stay simpler than spotlights — no vibe check, no EOI, no partnership pitch, no section reordering.

## Technical notes

- Migration: add `media jsonb not null default '{}'` to `public.profiles`, holding `{ video1..video4, video1_cover.., photo1..photo4 }`. Update the `public_profiles` view to expose `media` (it exposes no new PII). Existing `socials` jsonb is untouched.
- Uploads: `uploadSpotlightImage` is admin-gated, so add `uploadProfileImage` in `src/lib/profile-images.functions.ts` + `.server.ts` — authenticated middleware, same 8MB/type validation, writing to the public `spotlight-images` bucket under `profiles/<userId>/<uuid>.<ext>`.
- Reuse `ClipCard` and the poster-fetch logic from `SpotlightPageView` for profile clips; extract the small clip/photo grid pieces into a shared component (`src/components/profile/FeaturedMedia.tsx`) rather than duplicating spotlight markup.
- Profile builder collapsibles use the existing shadcn Collapsible pattern already used in the spotlight builder.
- `src/routes/u.$slug.tsx` query gains `media`; head metadata unchanged apart from continuing to work when media is absent.

## Vibe check on profiles

**Profile builder**
- New "Vibe check" input matching the spotlight builder: a comma-separated tags field (e.g. `Coffee, Travel, Fitness, Fashion…`), stored per user.
- Above it, a read-only line showing the user's archetype from their Vibe Check result ("Artist archetype: <name>" or "Brand archetype: <name>") with a "Retake" link to `/vibe-check`, plus a prompt to take the Vibe Check when they haven't yet.

**Public profile (`/u/<slug>`)**
- A "Vibe check" section rendering the tags as pills with the same pink hover treatment used on spotlight pages.
- The archetype name and its short description display above the tags, so the archetype pulls through to the public profile.

**Technical notes**
- Migration adds `vibe_tags text[] not null default '{}'` to `public.profiles` (alongside the `media` column above) and exposes `vibe_tags` plus the resolved archetype on the `public_profiles` view.
- Archetype is derived, not duplicated: the user's latest `vibe_check_responses` row is scored with `calculateVibeScore` / `calculateBrandVibe` against the live `vibe_check_config`, exactly as the dashboard does, so renamed archetypes stay in sync. For the public page (where the visitor can't read another user's responses), store the resolved archetype key and account kind on `profiles` when the Vibe Check is submitted or the profile is saved, and resolve the display name/description client-side from the live config using the stable key.

## Secondary social links and handle labels

**Profile builder**
- Inside the "Socials & links" dropdown, each platform gains an "Add another link" control for secondary profiles (band, podcast, side project, label page), matching the `*_extra` pattern used on spotlight pages.
- Every secondary link has an optional custom name field ("Band", "Personal", "Podcast") shown next to the handle.
- Follower syncing runs across primary and secondary links; totals roll up into Total social audience, Total fans and streams the same way spotlight pages aggregate, using the shared helpers in `src/lib/audience.ts`.

**Public profile (`/u/<slug>`)**
- Social buttons display the @handle rather than the platform name (e.g. `@createracket` with the Instagram icon), matching spotlight pages, falling back to the platform name when a handle can't be parsed.
- Secondary links render beneath the primary row, each prefixed with its custom name where set.

**Technical notes**
- Extend the `socials` jsonb with `<platform>_extra: string[]` and `<platform>_extra_names: string[]` arrays plus the existing primaries, so no schema change is needed beyond what's already listed.
- Reuse the spotlight `handleLabel` helper (extract it from `SpotlightPageView` into a shared util) for @handle rendering across both surfaces.
- Follower sync reuses `src/lib/campaign-scrapers.functions.ts` and counts against the same monthly usage allowance; syncing all links counts as one sync.
