CREATE TABLE public.post_stats_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.campaign_report_posts(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.campaign_report_creators(id) ON DELETE SET NULL,
  email text,
  requested_fields text[] NOT NULL DEFAULT '{}',
  message text,
  status text NOT NULL DEFAULT 'requested',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  screenshot_paths text[] NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  viewed_at timestamptz,
  submitted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_stats_requests_post_idx ON public.post_stats_requests(post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_stats_requests TO authenticated;
GRANT ALL ON public.post_stats_requests TO service_role;
ALTER TABLE public.post_stats_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stats requests" ON public.post_stats_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER post_stats_requests_touch BEFORE UPDATE ON public.post_stats_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();