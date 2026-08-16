-- Campaign reports: allow reading the non-sensitive thumbnail framing column
GRANT SELECT (thumb_frame) ON public.campaign_reports TO anon, authenticated;

-- Rosters: stop exposing client/brand emails on publicly readable rows.
REVOKE SELECT ON public.rosters FROM anon, authenticated;
GRANT SELECT (
  id, owner_id, title, description, created_at, updated_at, brief_id, slug,
  published, published_at, hide_prospect_tags, header_image_url,
  est_engagement_pct, hide_statuses, categories, custom_links,
  allow_multi_category, access_code, access_code_label, profile_image_url,
  thumb_frame
) ON public.rosters TO anon, authenticated;
GRANT ALL ON public.rosters TO service_role;