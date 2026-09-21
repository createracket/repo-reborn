ALTER TABLE public.spotlight_interests
  ADD COLUMN IF NOT EXISTS selected_parts text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.spotlight_interests
  DROP CONSTRAINT IF EXISTS spotlight_interests_selected_parts_limit;
ALTER TABLE public.spotlight_interests
  ADD CONSTRAINT spotlight_interests_selected_parts_limit
  CHECK (cardinality(selected_parts) <= 4);

DROP POLICY IF EXISTS "Anyone can view published rosters" ON public.rosters;

REVOKE SELECT ON public.rosters FROM anon;
GRANT SELECT (
  id, owner_id, title, description, created_at, updated_at, brief_id, slug,
  published, published_at, hide_prospect_tags, header_image_url,
  est_engagement_pct, hide_statuses, categories, custom_links,
  allow_multi_category, access_code, access_code_label, profile_image_url,
  thumb_frame, statuses, hide_metric_socials, hide_metric_fans,
  hide_metric_reach, hide_metric_engagement, show_metric_creators
) ON public.rosters TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_roster(text) TO anon, authenticated;