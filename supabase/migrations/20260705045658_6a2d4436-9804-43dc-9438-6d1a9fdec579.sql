
-- Fix EXPOSED_SENSITIVE_DATA: campaign_reports_published_email_exposure
-- Prior REVOKEs of column-level SELECT on brand_email/client_email were
-- overridden by a table-level GRANT SELECT to authenticated (relacl shows
-- authenticated=arwdDxtm). Table-level SELECT covers every column, so the
-- column-level revoke had no effect. Drop the table-level SELECT and re-grant
-- SELECT only on the non-sensitive columns.

REVOKE SELECT ON public.campaign_reports FROM authenticated;
REVOKE SELECT ON public.campaign_reports FROM anon;
REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  owner_id,
  title,
  description,
  slug,
  published,
  published_at,
  header_image_url,
  created_at,
  updated_at,
  source_roster_id
) ON public.campaign_reports TO authenticated;

-- service_role keeps full access for admin paths / edge functions.
GRANT ALL ON public.campaign_reports TO service_role;

-- Signed-in users may still write assignment values (existing pattern).
GRANT INSERT (brand_email, client_email),
      UPDATE (brand_email, client_email)
  ON public.campaign_reports TO authenticated;
