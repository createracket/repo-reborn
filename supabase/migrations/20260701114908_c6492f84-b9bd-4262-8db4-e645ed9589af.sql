
DROP VIEW IF EXISTS public.public_rosters;
DROP VIEW IF EXISTS public.public_roster_items;

-- Re-add anon/authenticated SELECT policies for published rosters
CREATE POLICY "Anyone can view published rosters" ON public.rosters
  FOR SELECT TO anon, authenticated
  USING (published = true AND slug IS NOT NULL);

CREATE POLICY "Anyone can view items of published rosters" ON public.roster_items
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rosters r
    WHERE r.id = roster_items.roster_id
      AND r.published = true
      AND r.slug IS NOT NULL
  ));

-- Restrict anon column-level access on rosters (exclude client_email, brand_email, owner_id, brief_id)
REVOKE SELECT ON public.rosters FROM anon;
GRANT SELECT (
  id, title, description, slug, published, published_at,
  header_image_url, hide_prospect_tags, created_at, updated_at
) ON public.rosters TO anon;

-- Restrict anon column-level access on roster_items (exclude vibe, budget)
REVOKE SELECT ON public.roster_items FROM anon;
GRANT SELECT (
  id, roster_id, kind, name, avatar_url,
  instagram_url, instagram_followers,
  tiktok_url, tiktok_followers,
  youtube_url, youtube_subscribers,
  spotify_url, spotify_monthly_listens,
  example_video_url, bio_page_url,
  position, status, created_at, updated_at
) ON public.roster_items TO anon;
