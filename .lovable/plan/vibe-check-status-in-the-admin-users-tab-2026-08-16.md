# Vibe Check status in the admin Users tab

Add a "Vibe check" column to the users table in the Admin > Users tab showing each user's archetype name once they've completed it, or "Pending" if they haven't.

## What you'll see

- New column between "Profile type" and "Slug":
  - Completed: a pill with the archetype name pulled live from your Vibe Check admin config (so renames show correctly), e.g. "The Collaborator".
  - Not taken: a muted "Pending" pill.
- Admin-only; nothing changes for users.

## How it works

Right now the vibe check results table only lets each user read their own row, so the admin list can't see who has completed it. The fix:

1. Add an admin-only read policy on the vibe check responses table (using the existing `has_role(auth.uid(), 'admin')` function) so you — and only you — can see completion status across users.
2. In the Users tab, load the latest response per user (id, result, archetype scores/keys) alongside the profiles list.
3. Resolve the archetype name through the live Vibe Check config helpers already used on the dashboard, falling back to the archetype stored on the profile (`vibe_archetype_key` / `vibe_archetype_kind`) when present, then to "Pending".

This also gives you the data needed later to trigger reminder emails to anyone still "Pending".

## Technical notes

- Migration: `CREATE POLICY "Admins can view all vibe checks" ON public.vibe_check_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));` plus confirm `GRANT SELECT ... TO authenticated`.
- `src/routes/_authenticated.admin.tsx`: extend the profiles select to include `vibe_archetype_key, vibe_archetype_kind`; add a parallel fetch of `vibe_check_responses (user_id, result, created_at)` mapped newest-first into a `Map<user_id, response>`; add the table header and cell.
- Archetype label resolution uses `loadVibeCheckConfig()` from `src/lib/vibe-check-config.ts` (same pattern as the dashboard) so renamed archetypes display correctly.
- No change to the user-facing profile or vibe check flows.
