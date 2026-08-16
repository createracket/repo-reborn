ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vibe_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS vibe_archetype_key text,
  ADD COLUMN IF NOT EXISTS vibe_archetype_kind text;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id,
    slug,
    display_name,
    artist_name,
    avatar_url,
    bio,
    account_type,
    location,
    top_audience_location,
    avg_engagement,
    avg_reach,
    monthly_streams,
    total_streams,
    total_followers,
    socials,
    "values",
    is_featured,
    created_at,
    media,
    vibe_tags,
    vibe_archetype_key,
    vibe_archetype_kind
   FROM public.profiles
  WHERE slug IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;