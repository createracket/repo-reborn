REVOKE SELECT ON public.campaign_briefs FROM anon, authenticated;

GRANT SELECT (
  id, user_id, title, description, budget, timeline, core_values,
  collaboration_types, target_audience, status, created_at, published,
  published_at, currency, transparency, linked_roster_id, artist_archetypes,
  brand_archetypes, display_order, linked_report_id, thumbnail_url, thumb_frame,
  brief_link, brief_file_path, brief_file_name, brief_file_size
) ON public.campaign_briefs TO authenticated;

GRANT ALL ON public.campaign_briefs TO service_role;