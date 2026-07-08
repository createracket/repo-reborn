ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS custom_links jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP VIEW IF EXISTS public.public_rosters;
CREATE VIEW public.public_rosters
WITH (security_invoker = true) AS
SELECT
  r.id, r.owner_id, r.title, r.slug, r.description, r.published, r.published_at,
  r.header_image_url, r.hide_prospect_tags, r.est_engagement_pct, r.hide_statuses,
  r.created_at, r.updated_at, r.categories, r.custom_links
FROM public.rosters r
WHERE r.published = true;

GRANT SELECT ON public.public_rosters TO anon, authenticated;