ALTER TABLE public.campaign_reports
  ADD COLUMN IF NOT EXISTS auto_pull_posts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_pull_start date,
  ADD COLUMN IF NOT EXISTS auto_pull_end date,
  ADD COLUMN IF NOT EXISTS auto_pull_last_run timestamptz,
  ADD COLUMN IF NOT EXISTS auto_pull_last_result jsonb,
  ADD COLUMN IF NOT EXISTS auto_pull_lease_until timestamptz;
ALTER TABLE public.campaign_report_posts
  ADD COLUMN IF NOT EXISTS auto_added boolean NOT NULL DEFAULT false;

GRANT SELECT (auto_pull_posts, auto_pull_start, auto_pull_end, auto_pull_last_run, auto_pull_last_result) ON public.campaign_reports TO authenticated;
GRANT UPDATE (auto_pull_posts, auto_pull_start, auto_pull_end) ON public.campaign_reports TO authenticated;
GRANT SELECT (auto_added), INSERT (auto_added), UPDATE (auto_added) ON public.campaign_report_posts TO authenticated;
GRANT ALL ON public.campaign_reports TO service_role;
GRANT ALL ON public.campaign_report_posts TO service_role;

CREATE TABLE public.campaign_report_dismissed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  post_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, post_key)
);
GRANT SELECT, INSERT, DELETE ON public.campaign_report_dismissed_posts TO authenticated;
GRANT ALL ON public.campaign_report_dismissed_posts TO service_role;
ALTER TABLE public.campaign_report_dismissed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dismissed posts" ON public.campaign_report_dismissed_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));