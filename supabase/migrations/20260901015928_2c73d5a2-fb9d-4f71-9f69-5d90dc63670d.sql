CREATE TABLE public.metric_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  done integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  cancel_requested boolean NOT NULL DEFAULT false,
  notify_email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.metric_job_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.metric_jobs(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.campaign_report_posts(id) ON DELETE CASCADE,
  post_url text,
  label text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX metric_jobs_report_idx ON public.metric_jobs(report_id, created_at DESC);
CREATE INDEX metric_jobs_status_idx ON public.metric_jobs(status);
CREATE INDEX metric_job_items_job_idx ON public.metric_job_items(job_id, status);

GRANT SELECT ON public.metric_jobs TO authenticated;
GRANT ALL ON public.metric_jobs TO service_role;
GRANT SELECT ON public.metric_job_items TO authenticated;
GRANT ALL ON public.metric_job_items TO service_role;

ALTER TABLE public.metric_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_job_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metric jobs" ON public.metric_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view metric job items" ON public.metric_job_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER metric_jobs_touch_updated_at BEFORE UPDATE ON public.metric_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER metric_job_items_touch_updated_at BEFORE UPDATE ON public.metric_job_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();