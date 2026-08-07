CREATE OR REPLACE VIEW public.public_rosters AS
SELECT id, owner_id, title, slug, description, published, published_at,
       header_image_url, profile_image_url, hide_prospect_tags, est_engagement_pct,
       hide_statuses, created_at, updated_at, categories, custom_links
FROM public.rosters r
WHERE published = true AND access_code IS NULL;