
ALTER TABLE public.campaign_report_posts
  ADD COLUMN IF NOT EXISTS followers integer;
