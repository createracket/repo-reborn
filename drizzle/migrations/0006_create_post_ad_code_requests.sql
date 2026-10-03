CREATE TABLE public.post_ad_code_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token text NOT NULL UNIQUE,
 report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
 post_id uuid NOT NULL REFERENCES public.campaign_report_posts(id) ON DELETE CASCADE,
 creator_id uuid REFERENCES public.campaign_report_creators(id) ON DELETE SET NULL,
 platform text NOT NULL CHECK (platform IN ('tiktok','instagram')),
 email text,
 message text,
 status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','viewed','submitted','reviewed')),
 code text,
 permission_confirmed boolean NOT NULL DEFAULT false,
 expires_on date,
 note text,
 sent_at timestamptz,
 viewed_at timestamptz,
 submitted_at timestamptz,
 reviewed_at timestamptz,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_ad_code_requests TO authenticated;
GRANT ALL ON public.post_ad_code_requests TO service_role;
ALTER TABLE public.post_ad_code_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ad code requests" ON public.post_ad_code_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX post_ad_code_requests_post_idx ON public.post_ad_code_requests(post_id, created_at DESC);
CREATE TRIGGER post_ad_code_requests_touch BEFORE UPDATE ON public.post_ad_code_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();