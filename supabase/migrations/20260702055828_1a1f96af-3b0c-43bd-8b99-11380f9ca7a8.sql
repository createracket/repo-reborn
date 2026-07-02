
-- Anonymous users must not read emails; authenticated users may, but RLS
-- policies still restrict which rows they can see (owner / admin / assigned).
GRANT SELECT (client_email, brand_email) ON public.rosters TO authenticated;
GRANT SELECT (client_email, brand_email) ON public.campaign_reports TO authenticated;
