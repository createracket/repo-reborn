# Streamline the brief page builder

## What will change
- Remove the separate **Section headings** panel from the brief builder.
- Rebuild **Content** as a page-flow editor: each editable page section will contain its heading and content together.
- Put each section’s border and text-size choices inside that same section.
- Keep drag-and-drop and arrow controls, but move them into the Content panel so sections can be reordered while editing.
- Keep page-level fields such as type, headline, subtitle and intro at the top of Content.
- Keep brief-only “Dos and don’ts” with its corresponding page section.

## Behaviour to preserve
- Existing briefs keep their saved headings, section order, borders and text sizes.
- Saving continues to use the current data structure, so public brief pages do not change unexpectedly.
- Spotlight builders remain unchanged; this streamlined layout applies only when building Brief pages.

## Technical details
- Refactor the shared builder conditionally for `section === "brief"`.
- Add a focused reusable section editor row containing heading, content, border, text-size and ordering controls.
- Leave sections without directly editable body content, such as media/player sections, represented in the ordering flow with their relevant heading and display controls.
- Validate the brief editor in desktop and mobile widths, including drag/drop, arrow ordering and save compatibility.
