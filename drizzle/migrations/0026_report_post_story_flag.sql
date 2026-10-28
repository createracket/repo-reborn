ALTER TABLE public.campaign_report_posts ADD COLUMN IF NOT EXISTS is_story boolean NOT NULL DEFAULT false;
GRANT SELECT (is_story) ON public.campaign_report_posts TO anon, authenticated;
GRANT INSERT (is_story), UPDATE (is_story) ON public.campaign_report_posts TO authenticated;