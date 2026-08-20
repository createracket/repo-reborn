# Add "Link or upload a brief" to the Connect form

## What gets added

A new line item in the "Anything else?" section:

- **Brief link** — a URL field (Google Doc, Notion, Dropbox, etc.). Validated as a real http/https link.
- **Or attach a brief** — a single file picker with strict limits.

Both are optional; people can use either, both, or neither.

## Keeping it safe and small

- **One file per brief, max 8MB.** Anything bigger is rejected in the browser before upload and again on the server.
- **Allow-list of document types only:** PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, plain text, and common images (JPG/PNG/WebP). Everything else — zips, executables, scripts, HTML, SVG — is refused. Checked by both file extension and the file's real content type on the server, not just what the browser claims.
- **Files are stored in a private bucket** (`brief-uploads`), not publicly readable. No one can browse or guess URLs. Only admins can view them, through a short-lived signed link from the admin Briefs view.
- **Uploads are never rendered in the browser** — admins download them, so a malicious file can't execute on the site.
- **Guests are rate-limited** (a small number of uploads per address per hour) so the bucket can't be flooded.
- Filenames are replaced with a random ID plus the original extension, so nothing user-controlled ends up in a path.

## Where it shows up

- Connect form: new fields under the voice-note/notes block.
- Admin Briefs tab: each brief shows "Brief link" (clickable) and "Attachment" (download button that mints a signed link valid for a few minutes).

## Technical notes

- Migration: add `brief_link text` and `brief_file_path text` (+ `brief_file_name`, `brief_file_size`) to `public.campaign_briefs` and `public.lead_briefs`; INSERT grants already exist for the relevant roles. Note `campaign_briefs` currently has no `additional_info` column — the signed-in path silently drops the notes field today; this plan adds the two link/file columns to both tables so signed-in submissions keep their attachment.
- New private storage bucket `brief-uploads` created via the storage tool, with no anon/authenticated SELECT policy; reads happen only through signed URLs minted server-side.
- Upload endpoint: `src/routes/api/public/upload-brief-file.ts` (public prefix so signed-out leads can use it), which validates size, extension, sniffed MIME, and per-IP rate limit, then writes with the service-role client and returns the storage path only.
- Client: file input + progress state in `src/routes/connect.tsx`; upload happens on submit, before the brief insert, so a rejected file blocks the submission with a clear message.
- Admin: signed-URL server function (`createSignedUrl`, ~5 min TTL) surfaced as a download button in `src/components/admin/BriefsManager.tsx`.
