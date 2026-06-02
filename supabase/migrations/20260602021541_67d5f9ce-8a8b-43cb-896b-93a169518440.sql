
-- Add profile customisation fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS artist_name text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS total_followers bigint,
  ADD COLUMN IF NOT EXISTS total_streams bigint,
  ADD COLUMN IF NOT EXISTS monthly_streams bigint,
  ADD COLUMN IF NOT EXISTS avg_reach bigint,
  ADD COLUMN IF NOT EXISTS avg_engagement numeric,
  ADD COLUMN IF NOT EXISTS top_audience_location text;

-- Public read for profiles that have published a public slug
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "Profiles with a slug are publicly viewable" ON public.profiles;
CREATE POLICY "Profiles with a slug are publicly viewable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (slug IS NOT NULL);

-- Add metrics to spotlight (partner_pages)
ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS total_followers bigint,
  ADD COLUMN IF NOT EXISTS total_streams bigint,
  ADD COLUMN IF NOT EXISTS monthly_streams bigint,
  ADD COLUMN IF NOT EXISTS avg_reach bigint,
  ADD COLUMN IF NOT EXISTS avg_engagement numeric;
