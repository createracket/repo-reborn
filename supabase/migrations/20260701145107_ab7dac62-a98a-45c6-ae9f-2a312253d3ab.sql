
DROP POLICY IF EXISTS "Assigned emails can view campaign reports" ON public.campaign_reports;
DROP POLICY IF EXISTS "Assigned client or brand can view roster" ON public.rosters;

CREATE OR REPLACE VIEW public.campaign_reports_assigned
WITH (security_invoker = false) AS
SELECT
  id, owner_id, title, description, slug, published, published_at,
  header_image_url, created_at, updated_at
FROM public.campaign_reports
WHERE
  (client_email IS NOT NULL AND lower(client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  OR
  (brand_email IS NOT NULL AND lower(brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

CREATE OR REPLACE VIEW public.rosters_assigned
WITH (security_invoker = false) AS
SELECT
  id, owner_id, title, slug, description, published, published_at,
  header_image_url, created_at, updated_at
FROM public.rosters
WHERE
  (client_email IS NOT NULL AND lower(client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  OR
  (brand_email IS NOT NULL AND lower(brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

REVOKE ALL ON public.campaign_reports_assigned FROM anon, authenticated;
REVOKE ALL ON public.rosters_assigned FROM anon, authenticated;
GRANT SELECT ON public.campaign_reports_assigned TO authenticated;
GRANT SELECT ON public.rosters_assigned TO authenticated;
