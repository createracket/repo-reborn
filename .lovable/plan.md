# Fix saving custom email templates

## What's happening

Creating a new email template fails with "Cannot read properties of undefined (reading 'bind')". The preview renders fine (that's done in the browser), so the failure is on save.

Most likely cause (to be confirmed as the first step): when a template is saved, the server pulls its merge-tag helper out of the email rendering module, and that module loads a browser-emulation-based HTML sanitiser (`isomorphic-dompurify`, which pulls in jsdom on the server). That library does not run in the app's serverless runtime, and the crash it produces matches this exact error. Nothing about the template content is wrong — the save path just can't load.

## Plan

1. **Confirm the cause.** Invoke the save function server-side and read the error/stack to verify it comes from the sanitiser/jsdom import rather than something else. If the stack points elsewhere, fix what it names instead and skip step 2.
2. **Split the merge-tag helpers out.** Move the dependency-free helpers (`applyMergeTags`, `extractVariables`, `resolveSubject`) into a small standalone module. Saving a template then needs no markdown or sanitiser code at all — the save path becomes plain data + regex, so it can't crash on a runtime-incompatible library.
3. **Replace the sanitiser used when an email is actually rendered.** Swap `isomorphic-dompurify` for a runtime-safe allowlist sanitiser (same tag/attribute allowlist already defined in the code, plus the `http/https/mailto/tel` URL rule), so rendering a custom email to HTML works in the serverless runtime too. Remove the now-unused dependency.
4. **Verify save works.** Save the "Profile Updcast" template through the admin dialog, confirm it appears in the template list, reopens with the same subject/body/merge tags, and that the detected merge tag `{{name}}` is stored.

## Sending safeguard

Saving only writes a row to the templates table — nothing is sent. The send path is a separate action (send/test-send), so this template stays in your admin view until you explicitly send it. I'll double-check that no code path auto-sends on save, and will not trigger a test send while verifying.

## Technical notes

- `src/lib/custom-templates.functions.ts` dynamically imports `extractVariables` from `src/lib/email-templates/render-custom.server.ts`, whose module scope imports `marked` and `isomorphic-dompurify`.
- New module: `src/lib/email-templates/merge-tags.ts` (no deps). `render-custom.server.ts` re-exports from it so existing imports keep working; the save function imports the new module directly.
- Sanitiser replacement stays server-side in `render-custom.server.ts`; the browser preview sanitiser in `CustomEmailEditor.tsx` is unchanged.
