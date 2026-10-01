# Project architecture decisions

- All eligible light-mode pages use the roster's grey/white palette and `.report-light` variants; reports and rosters share a guest-accessible saved preference while always-dark public pages stay dark, keeping the light experience consistent.
- Report metrics export is a server route at /report/<slug>/metrics.csv (public reports only, never triggers scraping); monthly refresh is opt-in per report via auto_refresh_monthly and a cron-called hook, so exports stay cheap and predictable.
