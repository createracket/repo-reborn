DROP POLICY "Users can update their own briefs" ON public.campaign_briefs;
CREATE POLICY "Users can update their own briefs"
ON public.campaign_briefs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY "Admins can update partner pages" ON public.partner_pages;
CREATE POLICY "Admins can update partner pages"
ON public.partner_pages FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));