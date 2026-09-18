# Per-page link previews for shared pages

Right now every link you share (brief, spotlight, roster, report) shows the same homepage image and generic text, because the preview details are set once for the whole site and never per page. This makes each shared page carry its own image, title and description.

## What you get

When someone pastes a link into Slack, WhatsApp, iMessage, LinkedIn or email:

- **Image** — the page's own picture, chosen in this order: a share image you set in the builder, then the dashboard thumbnail, then the header image, then the profile/logo image. If none exist, it falls back to the Create Racket image.
- **Title** — the page's tab name if set, otherwise its headline (e.g. "Tixel Social Collabs — Create Racket").
- **Description** — the page's subtitle or the first ~160 characters of its intro.

Pages stay unindexed by Google; previews work regardless because link unfurlers read the page directly.

## Ongoing management

In both the brief and spotlight builders, next to the existing slug and tab-name boxes, a new **Link preview** block:

- A **share image** field with the same fetch-from-link button and uploader you already use elsewhere.
- A **preview description** box (optional; defaults to the subtitle).
- A small live preview card showing roughly how the link will look when shared.
- A note that changes can take a while to show in apps that cache old previews, with a tip to add `?v=2` to a link to force a fresh one.

So the ongoing answer is: set it once per page in the builder, leave it blank to use sensible automatic defaults.

## Coverage

- `/brief/<slug>` and `/spotlight/<slug>` — full control as above.
- `/roster/<slug>` and `/report/<slug>` — same automatic behaviour (title + header/profile image), using their existing images; no new builder fields for now unless you want them.
- Gated pages: the preview uses the public gate details (headline + header image) only, never the locked content.

## Technical notes

- New public server fn `getSharePreview` (publishable-key read, no auth) returning `{ title, description, image }` for a slug, resolving the image from `links.share_image_url` → `thumb_frame`/`thumbnail_url` → `header_image_url` → `profile_image_url`. Works for gated pages by reading only the gate-safe columns.
- `src/routes/brief.$slug.tsx`, `spotlight.$slug.tsx`, `roster.$slug.tsx`, `report.$slug.tsx` gain a `loader` calling that fn plus `head({ loaderData })` emitting `title`, `description`, `og:title`, `og:description`, `og:image`, `og:type`, `twitter:card`, `twitter:image`. Existing `errorComponent`/`notFoundComponent` stay; loader failure falls back to the current static tags.
- Image URLs are made absolute (storage public URLs already are); relative or missing images omit `og:image` rather than emitting a broken tag.
- `og:image`/`twitter:image` move off `__root.tsx` onto `src/routes/index.tsx` and the other content routes, so leaf pages aren't competing with a site-wide image tag.
- Builder fields persist in the existing `partner_pages.links` JSONB (`share_image_url`, `share_description`) — no migration.
