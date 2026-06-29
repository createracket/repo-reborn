# In-dashboard email builder

Let admins create, edit, preview, and test-send email templates from Admin → Emails, without writing `.tsx` files.

## What you'll be able to do

- Click **New template** in the Templates tab and fill in name, subject, and body in a simple editor (Markdown + a few merge tags like `{{name}}`).
- See a live preview rendered exactly as it will arrive in the inbox.
- Send a test to any address with sample values for the merge tags.
- Edit or delete custom templates later. The existing code-defined templates (contact-confirmation, waitlist-confirmation, auth emails) keep working and show up alongside.
- Trigger a custom template from anywhere in the app by its name, the same way code templates are triggered today.

## How it works

1. **Storage** — new `email_custom_templates` table: `name` (slug, unique), `display_name`, `subject`, `body_markdown`, `variables` (string[]), timestamps, `created_by`. Admin-only RLS via `has_role(..., 'admin')`. Reads/writes go through new admin server functions.

2. **Rendering** — a single React Email wrapper component, `CustomEmail`, takes `{ subject, bodyHtml, siteName, unsubscribeUrl }` and renders a branded shell (matches existing templates' look: white body, brand container, footer). Markdown → HTML happens server-side with `marked` + `dompurify` (sanitized, safe subset). Merge tags `{{var}}` are replaced before markdown parsing using the supplied `templateData`.

3. **Registry integration** — `registry.ts` gains a runtime resolver: when the send route looks up a template by name and it's not in the static `TEMPLATES` map, it queries `email_custom_templates`. The existing send route (`/lovable/email/transactional/send`) needs a small change to await an async lookup, but the public API stays identical.

4. **Preview** — new admin server fn `previewCustomTemplate({ id | draft, sampleData })` returns rendered HTML + resolved subject. Dashboard shows it in an iframe (sandboxed) inside the editor dialog.

5. **Test send** — reuses the existing `sendTestEmail` server fn; it now accepts custom templates too and passes `sampleData` as `templateData`.

6. **UI** — Templates tab gets a **New template** button. Each custom template card shows Edit / Preview / Send test / Delete. Code templates remain read-only (Send test only) and are tagged "Built-in".

## Editor details

- Fields: Internal name (slug, auto-generated from display name, editable), Display name, Subject (supports `{{var}}`), Body (Markdown textarea with toolbar for bold/italic/link/heading/list/button), Variables (auto-detected from `{{...}}` usage in subject + body, shown as chips with sample-value inputs).
- Live preview pane next to the editor, debounced 300 ms, calls `previewCustomTemplate` with the current draft.
- "Send test" button at the bottom of the editor opens the existing test dialog pre-filled with this template.

## Technical notes

- New files:
  - `supabase/migrations/<ts>_email_custom_templates.sql` — table + GRANTs + RLS + admin policies.
  - `src/lib/email-templates/custom-email.tsx` — shared React Email shell.
  - `src/lib/email-templates/render-custom.server.ts` — markdown→sanitized HTML + merge-tag resolver + React Email render.
  - `src/lib/custom-templates.functions.ts` — admin CRUD + preview server fns (all behind `requireSupabaseAuth` + admin role check).
  - `src/components/admin/CustomEmailEditor.tsx` — editor dialog with live preview.
- Edited files:
  - `src/lib/email-templates/registry.ts` — async `resolveTemplate(name)` helper used by send + test routes.
  - `src/routes/lovable/email/transactional/send.ts` — call `resolveTemplate` instead of indexing `TEMPLATES`.
  - `src/lib/email-admin.functions.ts` — `getEmailTemplates` merges built-in + custom; `sendTestEmail` accepts `sampleData`.
  - `src/components/admin/EmailsAdmin.tsx` — wire in editor, list custom templates, Edit/Delete actions.
- Packages to add: `marked`, `isomorphic-dompurify` (Worker-compatible).
- Security: only `'admin'` role can list/create/edit/delete/preview/send-test custom templates. Markdown is sanitized; no `<script>`, `<iframe>`, inline event handlers, or `javascript:` URLs survive. Merge-tag substitution escapes HTML before insertion.

## Not in scope

- WYSIWYG rich-text editor (Markdown is faster to ship and safer to sanitize; we can swap in TipTap later).
- Image upload (links to hosted images work; uploads can be added later via the `spotlight-images` bucket pattern).
- Versioning / drafts / scheduled sends.
- Marketing/bulk sends — system stays single-recipient transactional only.
