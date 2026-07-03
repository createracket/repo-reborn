-- Restrict direct SELECT of sensitive assignment email columns on rosters.
-- Owners/admins read them via the SECURITY DEFINER function get_roster_assignment().
REVOKE SELECT (client_email, brand_email) ON public.rosters FROM authenticated;
REVOKE SELECT (client_email, brand_email) ON public.rosters FROM anon;