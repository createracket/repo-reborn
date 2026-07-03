REVOKE SELECT (client_email, brand_email) ON public.rosters FROM anon, authenticated;
REVOKE SELECT (client_email, brand_email) ON public.campaign_reports FROM anon, authenticated;