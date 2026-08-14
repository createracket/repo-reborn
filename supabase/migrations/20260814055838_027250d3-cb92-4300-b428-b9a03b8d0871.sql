GRANT SELECT ON public.campaign_reports TO anon;

CREATE POLICY "Anyone can view published reports"
ON public.campaign_reports
FOR SELECT
TO anon, authenticated
USING (published = true AND slug IS NOT NULL AND access_code IS NULL);