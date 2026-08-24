ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker=on) AS
  SELECT id, slug, display_name, artist_name, avatar_url, bio, account_type, location,
         top_audience_location, avg_engagement, avg_reach, monthly_streams, total_streams,
         total_followers, socials, "values", is_featured, created_at, media, vibe_tags,
         vibe_archetype_key, vibe_archetype_kind
  FROM public.profiles
  WHERE slug IS NOT NULL AND hidden = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;