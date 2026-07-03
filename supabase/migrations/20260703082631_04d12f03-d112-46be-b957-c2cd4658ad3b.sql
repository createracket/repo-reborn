CREATE POLICY "Admins can delete all campaign briefs" ON public.campaign_briefs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all lead briefs" ON public.lead_briefs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all lead briefs" ON public.lead_briefs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));