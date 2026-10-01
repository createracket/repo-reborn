ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS auto_refresh_monthly boolean NOT NULL DEFAULT false;
GRANT SELECT (auto_refresh_monthly), UPDATE (auto_refresh_monthly) ON public.campaign_reports TO authenticated;
UPDATE public.campaign_reports SET auto_refresh_monthly = true WHERE slug = 'tixel-report';