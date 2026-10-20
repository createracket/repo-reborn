CREATE TABLE public.campaign_report_listening_links (
 report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
 scan_id uuid NOT NULL REFERENCES public.social_listening_scans(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (report_id, scan_id)
);
GRANT SELECT, INSERT, DELETE ON public.campaign_report_listening_links TO authenticated;
GRANT ALL ON public.campaign_report_listening_links TO service_role;
ALTER TABLE public.campaign_report_listening_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage report listening links" ON public.campaign_report_listening_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.get_campaign_report_listening(_slug text)
RETURNS TABLE(id uuid, artist_name text, handle text, platform text, report_title text, created_at timestamptz, analysis jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT s.id, s.artist_name, s.handle, s.platform, s.report_title, s.created_at, s.analysis
 FROM public.campaign_report_listening_links l
 JOIN public.campaign_reports r ON r.id = l.report_id
 JOIN public.social_listening_scans s ON s.id = l.scan_id
 WHERE r.slug = _slug AND r.slug = 'chats-socials' AND r.published = true AND r.access_code IS NULL AND s.saved = true
 ORDER BY s.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_campaign_report_listening(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_report_listening(text) TO anon, authenticated, service_role;