# Start sending emails: triggers + manual sends

Today the site only sends two app emails automatically (contact form confirmation and waitlist confirmation), plus the admin "send test" button. Templates you create in the Emails tab exist but aren't attached to anything. This plan adds two things: an **event mapping** layer (template → site action) and a **manual send** tool (pick a template, pick recipients).

## 1. Assign templates to site actions

A new **Triggers** tab in the Emails admin lists every supported site event. For each event you choose which template to send (or "off"), and the event fires that template automatically with the right merge data.

Events to support at launch:

| Event | Recipient | Data available |
| --- | --- | --- |
| Contact form submitted | the sender | name, message |
| Mailing list / waitlist joined | the subscriber | name, email |
| New account created | the new user | name, account type |
| Interest registered on a brief/spotlight | the person registering | page title, link |
| Interest registered (admin copy) | you | who, which page, note |
| Brief shared to a user's planner | that user | brief title, link |
| Roster shared with a user | that user | roster title, link |
| Report shared / published to a client | client or brand contact | report title, link |
| Listening report shared with a user | that user | report title, link |
| Access-code page lead captured | you | email, page |

Each row shows the merge tags the event provides, so a template using `{{name}}` or `{{link}}` fills in correctly. Mapping is stored in a small config table, so you can change which template fires without a code change.

Safety: a trigger only sends when you've explicitly assigned a template and switched it on. Nothing starts sending on approval of this plan.

## 2. Send to specific users or external collaborators

A **Send** panel on each template lets you:
- pick registered users (searchable list by name/email), and/or
- paste external email addresses (comma or line separated),
- preview with real merge data for the first recipient,
- send with a confirmation step showing the recipient count.

Guardrails, per Lovable's email policy: this is for one-off operational messages (sharing a brief, notifying a collaborator), not newsletters or campaigns. The panel caps a single send at a modest number of recipients (e.g. 50), skips suppressed/unsubscribed addresses automatically, and logs every send in the existing Send log so you can see delivered/failed per person.

## 3. Visibility

- Send log already exists; it gains a filter for "triggered by" (which event or manual send).
- Suppressed list stays as-is — anyone who unsubscribes is skipped everywhere.

## Credits impact

- **Sending email costs no Lovable credits.** Email delivery runs through your own verified sending domain and the queue on your backend; it's not metered as AI usage.
- **AI credits are only consumed where the site calls a model** — profile sync, spotlight AI drafts, voice-note transcription, social listening. None of the email work above calls a model. If you later want AI-written email copy, that would be a model call and would be metered like the other AI actions (and can sit behind the same monthly allowance system).
- **Lovable credits are consumed by building/editing** the app (this work), not by runtime email volume.
- The practical limit to watch is **deliverability, not cost**: the queue sends ~120 emails/minute and your domain reputation depends on people expecting the mail. Keeping sends action-triggered (as above) protects that.

## Technical notes

- New table `email_event_bindings` (event key, template name, enabled, updated_by) with admin-only RLS + grants.
- New server functions in `src/lib/email-admin.functions.ts`: `getEventBindings`, `setEventBinding`, `sendTemplateToRecipients` (admin-gated, loops per recipient with a per-recipient `idempotencyKey`, reuses `enqueueTransactionalEmail`).
- A shared helper `sendForEvent(eventKey, recipient, data)` in `src/lib/email/send.server.ts` that resolves the binding and no-ops when unset; call sites added to the existing flows (contact, waitlist, signup trigger, interest registration, share actions).
- Admin UI: new `Triggers` tab plus a send dialog in `src/components/admin/EmailsAdmin.tsx`; recipient picker reuses the existing admin user list function.
- No changes to the queue, suppression, or unsubscribe infrastructure.
