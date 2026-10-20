CREATE OR REPLACE FUNCTION public.get_campaign_report_listening(_slug text)
RETURNS TABLE(id uuid, artist_name text, handle text, platform text, report_title text, created_at timestamptz, analysis jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
SELECT s.id, s.artist_name, s.handle, s.platform, s.report_title, s.created_at, s.analysis
FROM public.campaign_report_listening_links l
JOIN public.campaign_reports r ON r.id = l.report_id
JOIN public.social_listening_scans s ON s.id = l.scan_id
WHERE r.slug = _slug AND r.slug IN ('chats-socials', 'stat-socials') AND r.published = true AND r.access_code IS NULL AND s.saved = true
ORDER BY s.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_report_listening(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_campaign_listening_disclaimer(_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT s.disclaimer FROM public.campaign_report_listening_settings s JOIN public.campaign_reports r ON r.id = s.report_id WHERE r.slug = _slug AND r.slug IN ('chats-socials', 'stat-socials') AND r.published = true AND r.access_code IS NULL; $$;
GRANT EXECUTE ON FUNCTION public.get_campaign_listening_disclaimer(text) TO anon, authenticated, service_role;