DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['campaign_reports','campaign_report_creators','campaign_report_posts','rosters','roster_items','roster_members','roster_shares','lead_briefs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END$$;
-- Public report/roster pages read via anon
GRANT SELECT ON public.campaign_reports TO anon;
GRANT SELECT ON public.campaign_report_creators TO anon;
GRANT SELECT ON public.campaign_report_posts TO anon;
GRANT SELECT ON public.rosters TO anon;
GRANT SELECT ON public.roster_items TO anon;