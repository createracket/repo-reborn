ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.campaign_report_creators ADD COLUMN IF NOT EXISTS category text;