DROP POLICY "Admins manage all campaign reports" ON public.campaign_reports;
CREATE POLICY "Admins manage all campaign reports"
ON public.campaign_reports FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins manage all campaign report creators" ON public.campaign_report_creators;
CREATE POLICY "Admins manage all campaign report creators"
ON public.campaign_report_creators FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins manage all campaign report posts" ON public.campaign_report_posts;
CREATE POLICY "Admins manage all campaign report posts"
ON public.campaign_report_posts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));