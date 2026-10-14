ALTER TABLE public.campaign_report_posts ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;
GRANT SELECT (is_trial) ON public.campaign_report_posts TO anon, authenticated;
GRANT INSERT (is_trial), UPDATE (is_trial) ON public.campaign_report_posts TO authenticated;