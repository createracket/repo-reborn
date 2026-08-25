# Brief page history — what's recoverable, and how to stop losing edits

## The honest current state

I checked the database directly. The Tixel social brief (`tixel-social-brief`, a Brief page) exists and was last saved today at 10:08 UTC, with intro, host bio and partnership pitch all populated. But brief/spotlight pages are stored as a **single live row** — every save overwrites the previous text in place. There is no snapshot, revision or audit table anywhere in the backend, so **earlier versions of that page's copy are not stored and cannot be retrieved**. Lovable's project History restores code, not database content, so it won't bring the old wording back either.

What I can do is (1) give you a readable snapshot of the page as it stands right now, and (2) make sure this can't happen again.

## Proposed work

### 1. Export the current brief as a document
Generate a markdown/PDF-style export of the full Tixel social brief exactly as it renders today — every section in order, with headline, subtitle, intro, host bio, partnership pitch, EOI opportunities, audience segments, links, do's and don'ts, metrics and vibe tags — so you have an off-platform reference copy.

### 2. Version history for brief and spotlight pages
Add automatic snapshots so past copy is always recoverable:

- New `partner_page_versions` table storing a full JSON copy of a page each time it's saved, with timestamp and the admin who saved it.
- A database trigger writes the snapshot on every update — nothing for you to remember.
- Keep the most recent 30 versions per page (older ones pruned automatically).

### 3. "Version history" panel in the builder
In the spotlight/brief builder, a History button per page opens a panel listing saved versions by date and time. For each version you can:

- Preview the full content of that version side by side with the current one.
- Restore it (which itself creates a new snapshot, so restoring is never destructive).

## Technical notes

- `partner_page_versions`: `id`, `page_id`, `snapshot jsonb`, `saved_by uuid`, `created_at`. Admin-only RLS with the usual grants; pruning via the same trigger.
- Snapshot capture is a `BEFORE UPDATE` trigger on `partner_pages` storing `to_jsonb(OLD)`, so it captures history regardless of where the edit came from.
- Restore runs through an admin-only server function that writes the snapshot back into `partner_pages`.
- No change to how brief/spotlight pages render publicly.

## Note

This only starts capturing versions from the moment it's built — it can't reconstruct the Tixel edits already overwritten. If you have the previous wording in a doc, email or screenshot, send it over and I'll put it straight back into the page.
