# Community profiles: admin-only users, roster import, profile links

Adds a new kind of user — a profile that exists in the community, is visible and searchable by you in Admin, but has no login, no email, and no public page until you decide otherwise. Then imports every creator from your rosters as one of these.

## 1. New user kind: "Community profile"

- Created from the Users tab with no email and no password.
- Marked as **Managed** (no account yet) and **Hidden** (not public, not on anyone's dashboard, not in suggested matches or community search).
- You can see, search, edit and delete them exactly like normal users in Admin.
- Later, an **Assign email** action on a managed profile creates their real login account, keeps everything they already have (name, links, metrics, slug), sends them nothing until you choose to, and lets you flip Hidden off when their page should go live.

Every user row also gains a **Visibility** toggle (Hidden / Visible) so you can hide any account, not just imported ones.

## 2. Users tab improvements

- The **Slug** cell becomes a link to that person's profile page (`/u/<slug>`), opening in a new tab. No slug yet shows a muted "No slug".
- Hidden profiles still open for you as admin — the profile page falls back to an admin read when a page isn't public, with a small "Hidden — admin preview" note.
- New **Managed** and **Hidden** badges in the row so it's obvious at a glance.
- New button: **Create community profile** (name, optional slug, type, location) — no email fields.

## 3. Import roster creators

A one-click **Import roster creators** action in the Users tab:

- Reads every creator across all rosters (69 entries, 60 distinct people).
- Merges duplicates by name, taking the most complete entry, so each person gets one profile.
- Copies everything available: name, avatar, location, category as vibe tags, Instagram / TikTok / YouTube / Spotify / Twitch / Facebook / X / custom links, each follower count, Spotify monthly listeners, and a combined total audience figure.
- Generates a slug from their name (deduped, reserved words avoided).
- Creates them all as Managed + Hidden, not featured, so nothing appears publicly or on dashboards.
- Skips anyone who already has a profile with a matching name or slug, and reports created / skipped counts.

Safe to run more than once — it only ever adds what's missing.

## Technical notes

- Migration:
  - Drop `profiles_id_fkey` so a profile row can exist without an `auth.users` record; keep `id` as the primary key (nothing else references it).
  - Add `managed boolean not null default false` and `hidden boolean not null default false` to `public.profiles`.
  - Recreate `public.public_profiles` with `WHERE slug IS NOT NULL AND hidden = false` (keeps `security_invoker`, same column list plus nothing new).
  - Existing admin SELECT/UPDATE policies already cover admin reads/writes; inserts and deletes go through service-role server functions instead of new policies.
- `src/lib/admin-users.functions.ts` gains, all behind the existing `assertAdmin` check:
  - `adminCreateCommunityProfile` — inserts a managed + hidden profile with `gen_random_uuid()`.
  - `adminAssignEmail` — creates the auth user (the `handle_new_user` trigger makes its profile row), copies the managed row's fields onto it, deletes the managed row, returns the new id.
  - `adminSetProfileVisibility` — toggles `hidden`.
  - `adminDeleteProfile` — deletes a managed profile with no auth user (existing `adminDeleteUser` stays for real accounts).
  - `adminImportRosterCreators` — reads `roster_items` (including `co_posts`-free lead fields), merges by `lower(name)`, maps socials/followers into `profiles.socials`, `total_followers`, `monthly_streams`, `vibe_tags`, and slugs via `normalizeSlug`/`validateSlug` from `src/lib/slugs.ts`.
- `src/routes/_authenticated.admin.tsx`: extend the profiles select with `managed, hidden`, add the slug link, badges, visibility toggle, create form, import button, and an "Assign email" field in the existing edit dialog for managed rows.
- `src/routes/u.$slug.tsx`: when `public_profiles` returns nothing, retry against `profiles` (admin RLS allows it) before showing "not found".
- Community search (`community_profiles`) and dashboard suggested matches read the public view, so hidden rows are excluded automatically.
