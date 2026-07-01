
-- Remove public anon access from base tables to protect sensitive columns
DROP POLICY IF EXISTS "Anyone can view published rosters" ON public.rosters;
DROP POLICY IF EXISTS "Anyone can view items of published rosters" ON public.roster_items;

-- Create public views that expose only non-sensitive columns
CREATE OR REPLACE VIEW public.public_rosters
WITH (security_invoker = false) AS
SELECT id, title, description, slug, published, published_at, header_image_url, hide_prospect_tags, created_at, updated_at
FROM public.rosters
WHERE published = true AND slug IS NOT NULL;

CREATE OR REPLACE VIEW public.public_roster_items
WITH (security_invoker = false) AS
SELECT ri.id, ri.roster_id, ri.kind, ri.name, ri.avatar_url,
       ri.instagram_url, ri.instagram_followers,
       ri.tiktok_url, ri.tiktok_followers,
       ri.youtube_url, ri.youtube_subscribers,
       ri.spotify_url, ri.spotify_monthly_listens,
       ri.example_video_url, ri.bio_page_url,
       ri.position, ri.status, ri.created_at, ri.updated_at
FROM public.roster_items ri
JOIN public.rosters r ON r.id = ri.roster_id
WHERE r.published = true AND r.slug IS NOT NULL;

GRANT SELECT ON public.public_rosters TO anon, authenticated;
GRANT SELECT ON public.public_roster_items TO anon, authenticated;
