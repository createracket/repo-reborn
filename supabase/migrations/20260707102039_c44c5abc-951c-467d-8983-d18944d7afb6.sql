CREATE OR REPLACE VIEW public.public_rosters AS
SELECT id, owner_id, title, slug, description, published, published_at,
       header_image_url, hide_prospect_tags, est_engagement_pct, hide_statuses,
       created_at, updated_at, categories
FROM public.rosters
WHERE published = true AND slug IS NOT NULL;