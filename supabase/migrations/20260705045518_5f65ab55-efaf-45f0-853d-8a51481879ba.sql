
-- Fix EXPOSED_SENSITIVE_DATA: campaign_reports_published_email_exposure
-- The permissive "Authenticated users view published campaign reports" policy
-- combined with authenticated's column-level SELECT on brand_email/client_email
-- was exposing partner emails on every published report to any signed-in user.
-- Mirror the hardening already applied to rosters + campaign_briefs by revoking
-- direct column reads. Owners/assigned recipients continue to access these
-- addresses via the existing SECURITY DEFINER helpers
-- (get_campaign_report_assignment, get_assigned_campaign_reports).

REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM PUBLIC;
REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM anon;
REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM authenticated;

-- service_role retains full access for admin/edge-function paths.
GRANT SELECT (brand_email, client_email),
      INSERT (brand_email, client_email),
      UPDATE (brand_email, client_email)
  ON public.campaign_reports TO service_role;

-- Signed-in users still need to write their own assignment values through the
-- app (e.g. when an admin sets who a report is shared with), matching the
-- existing pattern on rosters.
GRANT INSERT (brand_email, client_email),
      UPDATE (brand_email, client_email)
  ON public.campaign_reports TO authenticated;
