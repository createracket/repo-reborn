DROP VIEW public.public_rosters;
CREATE VIEW public.public_rosters AS
SELECT id, owner_id, title, slug, description, published, published_at,
  header_image_url, profile_image_url, hide_prospect_tags, est_engagement_pct,
  hide_statuses, created_at, updated_at, categories, custom_links,
  hide_metric_socials, hide_metric_fans, hide_metric_reach,
  hide_metric_engagement, show_metric_creators
FROM public.rosters r
WHERE published = true AND access_code IS NULL;

GRANT SELECT ON public.public_rosters TO anon, authenticated;