CREATE TABLE public.campaign_report_listening_settings (
 report_id uuid PRIMARY KEY REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
 disclaimer text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE ON public.campaign_report_listening_settings TO authenticated;
GRANT ALL ON public.campaign_report_listening_settings TO service_role;
ALTER TABLE public.campaign_report_listening_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage listening settings" ON public.campaign_report_listening_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.get_campaign_listening_disclaimer(_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT s.disclaimer FROM public.campaign_report_listening_settings s JOIN public.campaign_reports r ON r.id = s.report_id WHERE r.slug = _slug AND r.slug = 'chats-socials' AND r.published = true AND r.access_code IS NULL; $$;
REVOKE ALL ON FUNCTION public.get_campaign_listening_disclaimer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_listening_disclaimer(text) TO anon, authenticated, service_role;