DROP POLICY IF EXISTS "Assigned emails view creators on their reports" ON public.campaign_report_creators;
CREATE POLICY "Assigned emails view creators on their reports"
ON public.campaign_report_creators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaign_reports r
  WHERE r.id = campaign_report_creators.report_id
    AND ((auth.jwt() ->> 'email') IN (r.client_email, r.brand_email))
));

DROP POLICY IF EXISTS "Assigned emails view posts on their reports" ON public.campaign_report_posts;
CREATE POLICY "Assigned emails view posts on their reports"
ON public.campaign_report_posts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaign_report_creators c
  JOIN public.campaign_reports r ON r.id = c.report_id
  WHERE c.id = campaign_report_posts.creator_id
    AND ((auth.jwt() ->> 'email') IN (r.client_email, r.brand_email))
));