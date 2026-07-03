REVOKE EXECUTE ON FUNCTION public.get_roster_assignment(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_campaign_report_assignment(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_roster_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_report_assignment(uuid) TO authenticated;