# Project architecture decisions

- All eligible light-mode pages use the roster's grey/white palette and `.report-light` variants; reports and rosters share a guest-accessible saved preference while always-dark public pages stay dark, keeping the light experience consistent.
- Report metrics export is a server route at /report/<slug>/metrics.csv (public reports only, never triggers scraping); monthly refresh is opt-in per report via auto_refresh_monthly and a cron-called hook, so exports stay cheap and predictable.
- Talent intake forms are token links (/talent/<token>, no login) handled by public server fns using the admin client gated on a pending token; submissions create an unpublished partner_pages draft with links.talent_intake_text pre-filling the builder info dump, so admins review before anything goes live.
