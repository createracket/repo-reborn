# Fix Sound Board thumbnail uploads

## What the error actually is

The message "new row violates row-level security policy" comes from the storage layer, not your sound board table. The Sound Board admin still uploads the file **straight from the browser** into the `spotlight-images` bucket. That browser request is evaluated against the bucket's insert rules, and the admin check doesn't hold up on that path — so the file is rejected before any database row is written.

This is exactly the same failure that spotlight thumbnails had. That one was fixed by moving the upload to the server, where the admin role is verified properly. Sound Board was never switched over, so it still uses the old broken path.

## Fix

Reuse the working server upload path instead of building anything new:

1. Allow a `sound-board` destination in the existing secure upload server function (currently limited to `spotlights` and `video-covers`).
2. Change the Sound Board admin's "Upload image" button to call that server function instead of uploading directly from the browser, then save the returned public URL onto the card as it does today.

Manual URL pasting stays exactly as it is, so you can still drop a file into storage yourself and link it if you prefer.

## Technical detail

- `src/lib/spotlight-images.functions.ts`: add `"sound-board"` to the `folder` enum.
- `src/lib/spotlight-images.server.ts`: confirm the folder value is used verbatim in the storage path (no other change expected).
- `src/components/admin/SoundBoardAdmin.tsx`: replace the `supabase.storage.from("spotlight-images").upload(...)` call in `uploadCover` with `useServerFn(adminUploadSpotlightImage)`, reading the file as base64 and passing `folder: "sound-board"`.
- No database migration and no new bucket required.

## Verification

Upload a thumbnail from the Sound Board tab and confirm the image saves, displays on the card, and loads on the dashboard.
