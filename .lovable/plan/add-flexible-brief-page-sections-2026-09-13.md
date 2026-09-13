# Add flexible Brief page sections

## What will change
- Add a clear **Show/Hide** control to every Brief page section. Hidden sections remain available in the builder but do not appear on the public Brief page.
- Add a **Duplicate** action to every section. A duplicate starts blank and can be edited, styled, positioned, shown, or hidden independently.
- Make the minimise/expand control visually distinct from the up/down ordering arrows.
- Keep all Brief sections minimised when the editor first opens.

## Behaviour to preserve
- Existing Brief pages retain their current content, order, borders, text sizes, and visibility.
- Empty sections continue to stay off the public page.
- Spotlight builders and Spotlight public pages remain unchanged.
- Saving continues through the existing Brief record without a database migration.

## Technical details
- Introduce a backwards-compatible Brief-only section-instance format in the existing page settings data.
- Convert legacy section keys to stable section instances in the editor, while continuing to read old saved Briefs.
- Store duplicated section headings and content independently; new duplicates begin blank.
- Render visible Brief section instances in their saved order, resolving legacy content for original sections and instance content for duplicates.
- Validate editing, saving, reloading, hiding, duplicating, ordering, and public rendering at desktop and mobile widths.
