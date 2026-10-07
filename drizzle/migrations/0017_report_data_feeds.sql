ALTER TABLE public.campaign_report_posts ADD COLUMN IF NOT EXISTS account_synced_at timestamptz;
GRANT SELECT (account_synced_at) ON public.campaign_report_posts TO authenticated;
GRANT ALL ON public.campaign_report_posts TO service_role;
ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS data_feed_key text;
GRANT ALL ON public.campaign_reports TO service_role;