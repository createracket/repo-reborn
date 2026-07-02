
-- Enforce column-level privileges so the "Anyone can view published..." policies
-- can never return client_email/brand_email to anon/authenticated. Owners and
-- admins still read the full row via their own policies (postgres/service_role
-- roles); assigned client/brand users get emails via SECURITY DEFINER RPCs.

DO $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'id','owner_id','title','description','slug','published','published_at',
    'header_image_url','hide_prospect_tags','brief_id','created_at','updated_at'
  ];
BEGIN
  -- rosters
  REVOKE SELECT ON public.rosters FROM anon, authenticated;
  FOREACH col IN ARRAY cols LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.rosters TO anon, authenticated', col);
  END LOOP;
END $$;

DO $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'id','owner_id','title','description','slug','published','published_at',
    'header_image_url','created_at','updated_at'
  ];
BEGIN
  -- campaign_reports
  REVOKE SELECT ON public.campaign_reports FROM anon, authenticated;
  FOREACH col IN ARRAY cols LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.campaign_reports TO anon, authenticated', col);
  END LOOP;
END $$;
