ALTER TABLE public.rosters
  ADD COLUMN IF NOT EXISTS hide_metric_socials boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_metric_fans boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_metric_reach boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_metric_engagement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_metric_creators boolean NOT NULL DEFAULT false;