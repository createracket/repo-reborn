# Profile sync limits + usage safeguards

Your profile page already has sync buttons (Instagram / TikTok / YouTube followers, Spotify, Apple Music) and they call auth-gated server functions — but there is no per-user cap, and two AI endpoints are reachable without signing in. This plan adds monthly quotas, tracking, and an admin view before you open access.

## 1. Profile sync: 1 per calendar month per user

- Every sync action on `/profile` (socials, Spotify, Apple Music) counts against one monthly allowance.
- Before running, the server checks the user's usage for the current month. If already used, the sync is refused with a clear message: "You've used this month's sync — next available 1 [Month]."
- The profile page shows the remaining allowance and next reset date next to the sync buttons, and disables the buttons when spent.
- One sync run refreshes all populated links at once (rather than burning the allowance on a single platform), so the user gets full value from their monthly run.
- Admins are exempt — unlimited syncing from the profile, roster builder and report builder as today.

## 2. Usage tracking and limits for AI actions

A single usage ledger records each metered action per user, per month:

| Action | Default limit / user / month |
|---|---|
| Profile sync run | 1 |
| Vibe check intro parse (AI) | 3 |
| Brief voice-note transcription | 3 |
| Post/profile scrapes from builders | admin-only, unmetered |

Limits are stored as config so you can change them without a code change.

## 3. Close the open AI endpoints

- Voice-note transcription (`/api/public/transcribe-voice-note`) currently accepts uploads from anyone. It moves behind sign-in and the transcription quota, keeps the 5MB / ~2 min cap, and rejects non-audio types.
- The vibe-check intro parse server function currently has no auth. It gets sign-in + quota too. (If you want the vibe check to stay usable logged-out, we instead cap it by session/IP — tell me which you prefer.)

## 4. Admin: usage + content management

New "Usage" tab in the admin panel:
- Per-user table: syncs, intro parses, transcriptions this month, with totals and a month selector.
- Top consumers sorted by usage, so abuse is obvious at a glance.
- Per-user "grant extra allowance" button (adds credits for the current month) and a "block metered actions" toggle for a problem account.
- Editable default limits per action.

Content safeguards for when users start logging in:
- Run the existing profanity filter over profile bio/name, community profile fields and brief free-text on save (it's currently applied on some forms only).
- Admin list of recently created/updated user profiles with unpublish + block controls, so new sign-ups can be reviewed.

## Technical notes

- New table `public.usage_events` (user_id, action, period `YYYY-MM`, count, updated_at) plus `public.usage_limits` config, both with RLS: users read only their own rows, admins read all, writes happen server-side only.
- Quota enforcement lives in a shared server helper called from `campaign-scrapers.functions.ts` (profile-page callers), `vibe-intro.functions.ts` and the transcription route — increment happens only after a successful call, so failed scrapes don't burn the allowance.
- The transcription endpoint moves from `src/routes/api/public/` to an authenticated server function (or an authenticated API route if the client needs raw upload), verified with a bearer token.
- Admin exemption uses the existing `has_role(auth.uid(),'admin')` check.
- Note: there is no built-in rate-limiting primitive on the backend, so this is an app-level monthly quota, not per-second throttling. It caps cost per user per month, which is the goal here.
