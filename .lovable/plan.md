# AI-assisted Spotlight builder

Goal: paste a raw artist email into the admin Spotlight editor and have AI draft the whole spotlight for you to review, tweak and save.

## What you'll see

In the Admin > Spotlights tab, a new panel at the top of the spotlight editor:

- A large "Paste artist email / info dump" text box
- A "Draft spotlight with AI" button
- While it runs: a short "Drafting…" state
- When it finishes: the form fields below are filled in with a suggested draft, and a note tells you which fields were populated. Nothing is saved until you press Save, so you can edit everything first.
- An "Undo AI draft" button restores the field values from just before the draft ran.

Fields the AI drafts:
- Headline (artist name), subtitle, slug (if empty)
- Intro (short punchy summary)
- Host/artist bio
- Partnership pitch (why a brand should work with them, tour timings, reach)
- Expressions of interest (one per line — e.g. tour sponsorship, festival activations, content series, sync)
- Audience segments (one per line — inferred interest/lifestyle groups)
- Any social/Spotify links found in the pasted text

It never overwrites the image uploads, access code, metrics or published toggle.

## First use: State Champs

After the feature is in, I'll run the pasted State Champs email through it and save an unpublished spotlight at `/spotlight/state-champs` — with the US headline tour (Nov 5 – Dec 6), Warped MX (Sep 13) and Four Chord Fest Pittsburgh (Sep 26) as sponsorship timings, dream partners (electrolytes/LMNT, Away Luggage, health & fitness and supplements, Insta360, coffee brands) surfaced as EOI/partnership angles, and sync flagged as open-to-explore. You review and publish when ready.

## Technical notes

- New server function `src/lib/spotlight-draft.functions.ts`, admin-only (`requireSupabaseAuth` + `has_role` admin check), calling Lovable AI (`google/gemini-3.6-flash`) via the AI SDK gateway helper with a structured output schema matching the spotlight fields. Input capped (~20k chars) to control token spend.
- Admin UI change is contained to the spotlight editor component in `src/routes/_authenticated.admin.tsx`: new textarea + button + "apply draft to form state" handler.
- Usage is metered through the existing `usage_events` / `usage_limits` tables under a new `spotlight_draft` action so it shows up in the Usage tab (admin-only, so no hard cap by default).
- No schema change to `partner_pages`.
