DROP POLICY IF EXISTS "Assigned emails can view campaign reports" ON public.campaign_reports;
CREATE POLICY "Assigned emails can view campaign reports"
ON public.campaign_reports
FOR SELECT
TO authenticated
USING (
  client_email = (auth.jwt() ->> 'email')
  OR brand_email = (auth.jwt() ->> 'email')
);