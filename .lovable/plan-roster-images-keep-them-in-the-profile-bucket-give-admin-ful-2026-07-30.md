# Roster images: keep them in the profile bucket, give admin full access

## What's happening now

Roster images (page header + creator photos) already save into the **avatars** bucket — the same place profile pictures live — under `<your-user-id>/roster/<roster-id>/…`.

The bucket itself is public for reading, but its write rules only let a person write into a folder named after their own user ID. There is no admin exception, so dropping a file into any other folder from the Storage view is rejected — that's the "private / can't upload" behaviour you're hitting. (The separate `user-files` bucket is fully private and unrelated.)

## What to change

1. **Give admins full write access to the `avatars` bucket**
   - Admins can upload, replace, and delete any file in `avatars`, in any folder, including from the Storage view in the backend.
   - Everyone else keeps the existing rule: they can only touch their own folder.
   - Public read stays as-is, so links keep working on shared roster pages.

2. **Add a tidy shared folder: `avatars/roster/<roster-slug>/`**
   - You can drag files straight into it in Storage and copy the public link into the "Header image URL" / "Photo URL" fields already in the roster builder.
   - Existing images and their URLs are untouched.

3. **Point roster builder uploads at that same folder**
   - The Upload buttons keep working exactly as now, but write to `avatars/roster/<roster-slug>/…` instead of a user-ID folder, so manual drops and button uploads end up side by side.

## Technical details

- Migration on `storage.objects`: add admin policies for `bucket_id = 'avatars'` using `public.has_role(auth.uid(), 'admin')` for INSERT / UPDATE / DELETE, alongside the existing owner-folder policies. Also allow authenticated writes under the `roster/` prefix only for admins.
- `src/routes/_authenticated.roster-builder.tsx`: change the two upload paths (header image ~line 1025, creator photo ~line 1915) from `${user.id}/roster/...` to `roster/${roster.slug}/...`.
- No changes to the public roster page or to profile avatar uploads.
