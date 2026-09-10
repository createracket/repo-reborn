# Give each admin tab its own web address

Today everything in the admin area lives at one address (`/admin`), and the tab
you're on is remembered with a `?tab=` suffix. Switching tabs already avoids
re-fetching data, but the whole admin page — every tab's screen, forms and
editors — is downloaded in one big chunk before anything appears. That's the
main reason the first load feels slow.

## What changes for you

- Each tab gets a real address: `/admin/project-planner`, `/admin/traffic`,
  `/admin/users`, `/admin/spotlights`, `/admin/contact`, and so on.
- You can bookmark a tab, refresh on it, and use the browser back button
  between tabs.
- Opening the admin area only downloads the tab you asked for, so first paint
  is much faster; other tabs load on demand when clicked.
- Old links keep working: `/admin` sends you to the traffic tab, and
  `/admin?tab=users` redirects to `/admin/users`. Existing "edit" deep links
  (used by the Edit buttons on roster/report/brief/spotlight pages) keep
  working too.

## How it's built

1. **Split the shell into a layout route.** `src/routes/_authenticated.admin.tsx`
   becomes a layout: admin gate (session + `user_roles` check), header/footer,
   the tab bar rendered as `Link`s, and `<Outlet />`. No tab bodies in it.
2. **Move shared state into a small context** (`AdminDataProvider`) holding the
   existing per-group cached loaders (`profiles`, `vibe`, `contact`,
   `spotlights`, `mailing`) plus the counts shown on the tab labels and the
   unread-contact badge. Each child route calls a hook to request the groups it
   needs; the caching/retry behaviour already in place is preserved.
3. **Create one child route per tab** under `src/routes/_authenticated.admin.<tab>.tsx`,
   each rendering a lazily imported panel component. Tabs that already have
   panel components (traffic, emails, community, brief form, vibe, FAQs, sound
   board, usage, project planner) just render those. The tab bodies still inline
   in the current file are extracted into new components:
   - `src/components/admin/SpotlightsAdmin.tsx` (spotlight list, editor form,
     interests, archive, shares/history)
   - `src/components/admin/UsersAdmin.tsx` (profile table, filters, community
     profile editor, avatar upload)
   - `src/components/admin/ContactAdmin.tsx` (messages, handled list)
   - `src/components/admin/MailingAdmin.tsx`
4. **Index redirect.** `src/routes/_authenticated.admin.index.tsx` redirects to
   `/admin/traffic`; the layout keeps `validateSearch` for `?tab=` and `?edit=`
   and redirects legacy `?tab=` links to the matching child route.
5. **Update internal links** that point at `/admin?tab=…` — the admin shortcut
   pills, `AdminEditButton`, and any dashboard links — to the new paths, keeping
   `?edit=` where it's used.

## Notes

- No database or permissions changes; the admin-only gate stays exactly where
  it is, now covering all child routes from the layout.
- Heavy editors (spotlight/brief forms, rich text) stay lazily loaded, so they
  only download when opened.
