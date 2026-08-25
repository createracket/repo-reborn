# Version history for brief and spotlight pages

## Why

Brief and spotlight pages are stored as a single live row — every save overwrites the previous text in place. There is no snapshot or revision table in the backend, so earlier versions of the Tixel social brief (or any page) can't be recovered. Lovable's project History restores code, not page content.

This adds automatic version history from now on. It can't reconstruct edits already overwritten.

## What gets built

### 1. Automatic snapshots
- New `partner_page_versions` table storing a full copy of a page each time it's saved, with a timestamp and the admin who saved it.
- A database trigger writes the snapshot on every update — nothing to remember, and it captures edits made from anywhere.
- Keep the 30 most recent versions per page; older ones pruned automatically.

### 2. "History" panel in the builder
In the spotlight/brief builder, a History button per page opens a panel listing saved versions by date and time. For each version you can:
- Preview the full content of that version, so you can compare against what's live now.
- Restore it. Restoring itself creates a new snapshot first, so it's never destructive and can be undone.

## Technical notes

- `partner_page_versions`: `id`, `page_id`, `snapshot jsonb`, `saved_by uuid`, `created_at`. Admin-only RLS with the usual grants.
- Snapshot capture via a `BEFORE UPDATE` trigger on `partner_pages` storing `to_jsonb(OLD)`; the same trigger prunes beyond 30 rows per page.
- Reads and restores go through admin-only server functions; restore writes the snapshot fields back into `partner_pages`.
- No change to how brief or spotlight pages render publicly.
