GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_reports TO authenticated;
GRANT ALL ON public.campaign_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_report_creators TO authenticated;
GRANT ALL ON public.campaign_report_creators TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_report_posts TO authenticated;
GRANT ALL ON public.campaign_report_posts TO service_role;