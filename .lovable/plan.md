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
