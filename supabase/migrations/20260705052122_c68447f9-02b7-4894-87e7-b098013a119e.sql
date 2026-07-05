
ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS est_engagement_pct numeric(5,2);

DROP VIEW IF EXISTS public.public_rosters;
CREATE VIEW public.public_rosters AS
SELECT id, owner_id, title, slug, description, published, published_at,
       header_image_url, hide_prospect_tags, est_engagement_pct,
       created_at, updated_at
FROM public.rosters
WHERE published = true AND slug IS NOT NULL;

GRANT SELECT ON public.public_rosters TO anon, authenticated;
