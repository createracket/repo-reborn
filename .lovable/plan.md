# Remove "Take the tour" from Racket Desk (keep the code on file)

## What changes
- The "Take the tour" link disappears from the Racket Desk sub-navigation, so nobody can reach the tour page from the UI.
- The tour page itself is not deleted — its full code is archived in the project files so it can be restored later.

## Technical detail
1. `src/routes/_authenticated.racket-desk.tsx` — remove the nav entry `{ to: "/racket-desk/demo", label: "Take the tour" }`.
2. Move `src/routes/_authenticated.racket-desk.demo.tsx` to `files/archive/racket-desk-demo.tsx.txt` (outside `src/routes/`, so the router no longer registers `/racket-desk/demo`; `.txt` keeps it out of type-checking/build).
3. Add a one-line header comment in the archived file noting where it came from and how to restore it (move back into `src/routes/` with the original name).

## Restoring later
Move the archived file back to `src/routes/_authenticated.racket-desk.demo.tsx` and re-add the nav entry.
