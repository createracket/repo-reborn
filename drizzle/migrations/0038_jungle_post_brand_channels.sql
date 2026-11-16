ALTER TABLE public.campaign_report_posts ADD COLUMN brand_channels jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT SELECT (brand_channels) ON public.campaign_report_posts TO anon, authenticated;
GRANT INSERT (brand_channels), UPDATE (brand_channels) ON public.campaign_report_posts TO authenticated;
GRANT ALL ON public.campaign_report_posts TO service_role;