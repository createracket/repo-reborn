# Bring spotlight builders in line with brief builders

## What will change
- Replace the spotlight builder’s separate **Content** and **Section headings** areas with the same **Content & page flow** editor used for briefs.
- Put each spotlight section’s heading, content, border and text-size controls together in one collapsible row.
- Give spotlight sections the same drag-and-drop and arrow reordering, **Show/Hide**, **Duplicate**, and minimise/expand controls.
- Keep all section rows minimised when an existing or new spotlight editor first opens.
- Include the same managed section types available to briefs, including video and photo sections.

## Existing spotlight compatibility
- Existing spotlight content, custom headings, section order, borders and text sizes will load into the new editor automatically.
- Existing public spotlight pages will keep their current appearance until an admin changes their settings.
- Empty sections will remain absent from public pages, while explicitly hidden sections will stay hidden.
- Newly duplicated spotlight sections will start blank and remain independent from their originals.

## Technical details
- Generalise the current Brief-only section-instance editor so both Brief and Spotlight builders use it.
- Continue reading the legacy spotlight section order and content fields, converting them into section rows in the editor without a database migration.
- Save section instances for both page types in the existing page settings data, while retaining support for older saved Brief and Spotlight records.
- Update public spotlight rendering to honour saved section instances, visibility, duplicates, order, borders and text size in the same way as public Brief pages.
- Keep spotlight-only tools and settings, including AI drafting and access controls, unchanged.
- Validate editing, saving, reloading and public rendering for an existing spotlight at desktop and mobile widths.
