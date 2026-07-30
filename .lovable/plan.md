# Dedicated roster image storage

## Where roster images live today

Roster images (page header image and each creator photo) are uploaded into the shared **avatars** bucket, under a path like `<your-user-id>/roster/<roster-id>/<random>.jpg`. That's why they're hard to find in the Storage section — they sit alongside every user's profile picture, in folders named by ID.

Both the header image and creator photo already have a "Photo URL" text box next to the upload button, so manual linking works today — it's just awkward because there's no tidy folder to drop files into.

## What to change

1. **New public bucket: `roster-images`**
   - Roster uploads go to `roster-images/<roster-slug>/header-<id>.jpg` and `roster-images/<roster-slug>/creators/<name-slug>-<id>.jpg`.
   - Readable by anyone (roster pages are shared by link), writable only by admins.
   - You can drag files straight into that folder in the Storage view and copy the public link.

2. **Keep the upload buttons exactly as they are** — same one-click flow, just saving into the new bucket.

3. **Add a "Choose from library" picker** next to each upload button
   - Opens a dialog listing files already in `roster-images` for that roster's folder (plus a "all folders" view), with thumbnails.
   - Clicking one fills the image URL field — no copy/paste needed for files you dropped in manually.

4. **Existing images stay working.** Images already in `avatars` keep their URLs; nothing is migrated or broken. Only new uploads use the new bucket.

## Technical details

- Create bucket `roster-images` (public) via the storage tool; add `storage.objects` RLS policies: public SELECT for that bucket, INSERT/UPDATE/DELETE restricted to `has_role(auth.uid(), 'admin')`.
- Update the two upload handlers in `src/routes/_authenticated.roster-builder.tsx` (header image around line 1025, creator photo around line 1915) to target `roster-images` with slug-based paths.
- New component `src/components/roster/RosterImagePicker.tsx`: lists objects via `supabase.storage.from('roster-images').list(prefix)`, renders a grid of thumbnails, returns the chosen public URL.
- No changes to the public roster page — it renders whatever URL is stored.
