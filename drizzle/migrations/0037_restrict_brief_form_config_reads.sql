DROP POLICY "Anyone can read brief form config" ON public.brief_form_config;
CREATE POLICY "Public can read active brief form settings" ON public.brief_form_config FOR SELECT TO anon, authenticated USING (id = 'default');
CREATE POLICY "Signed-in users can read dashboard settings" ON public.brief_form_config FOR SELECT TO authenticated USING (id = 'dashboard');
CREATE POLICY "Admins can read brief form settings" ON public.brief_form_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.brief_form_config FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, config) ON public.brief_form_config TO anon, authenticated;
GRANT ALL ON public.brief_form_config TO service_role;