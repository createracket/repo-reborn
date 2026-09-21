# Update Tixel brief interest choices

## What will change
- Keep the four Tixel brief opportunities on one horizontal row on wider screens, wrapping safely on smaller screens.
- Open the interest form for every visitor and let them select any combination of Part 1, Part 2, Part 3, and Part 4.
- Require at least one part before submission and keep email required for signed-out visitors.
- Save the selected parts with the existing interest record and show them beside the visitor's email in the admin Contact tab.
- Preserve the current interest confirmation and duplicate-submission behaviour.

## Technical details
- Add a validated selected-parts field to interest records, with existing records remaining valid.
- Route both signed-in and guest submissions through server-side validation so selections cannot be forged or exceed the four options on this brief.
- Update the Contact tab query and display for the selected parts.
- Restrict public roster reads to the existing safe public function so client and brand emails are not exposed.
- Verify the Tixel brief submission flow and Contact tab display.
