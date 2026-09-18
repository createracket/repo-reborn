# Add partner logos to spotlight pages

## What will change
- Add a Spotlight-only **Partners** row inside **Content & page flow**.
- Allow up to six partner social links from Instagram, TikTok, or Facebook.
- Add a sync action beside each link to fetch and permanently save the partner’s available social thumbnail; keep a manual image upload/URL fallback when a platform does not provide one.
- Let the Partners row use the existing heading, show/hide, hide-title, duplicate, ordering, border, and text-size controls.
- Display saved partners as a compact row of linked square images on the public spotlight page, visibly smaller than Photos.

## Compatibility
- Existing spotlight pages gain an empty Partners row in the editor but remain visually unchanged until partner links and images are added.
- Brief builders and public brief pages remain unchanged.
- Partner data stays in the existing spotlight page settings, so no database change is needed.

## Technical details
- Extend spotlight section settings with partner URL/image pairs and a custom Partners heading.
- Reuse the existing server-side image sync and storage flow for social thumbnails.
- Validate and render only Instagram, TikTok, and Facebook profile links; external links open safely in a new tab.
- Support original and duplicated Partners sections through the existing section-instance format.
- Verify saving, reloading, linked-image rendering, section visibility, and mobile layout.
