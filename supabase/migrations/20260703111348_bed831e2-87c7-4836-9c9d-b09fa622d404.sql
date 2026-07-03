
-- Restrict column-level SELECT on email fields so anon/authenticated SELECT policies
-- (public published, shared, owner) cannot expose brand/client emails. Owners and
-- admins continue to read these via the existing SECURITY DEFINER RPCs
-- (get_campaign_report_assignment, get_roster_assignment).

REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM anon, authenticated;
REVOKE SELECT (brand_email, client_email) ON public.rosters FROM anon, authenticated;

-- Ensure service_role retains full access.
GRANT ALL ON public.campaign_reports TO service_role;
GRANT ALL ON public.rosters TO service_role;
