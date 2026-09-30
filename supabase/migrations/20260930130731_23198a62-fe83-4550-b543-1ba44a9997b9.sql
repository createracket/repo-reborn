ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS custom_links jsonb NOT NULL DEFAULT '[]'::jsonb;
GRANT SELECT (custom_links), UPDATE (custom_links) ON public.campaign_reports TO authenticated;
GRANT SELECT (custom_links) ON public.campaign_reports TO anon;
GRANT ALL ON public.campaign_reports TO service_role;