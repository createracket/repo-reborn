ALTER TABLE public.campaign_report_posts ADD COLUMN IF NOT EXISTS new_followers integer;
GRANT SELECT (new_followers) ON public.campaign_report_posts TO anon, authenticated;
GRANT INSERT (new_followers), UPDATE (new_followers) ON public.campaign_report_posts TO authenticated;