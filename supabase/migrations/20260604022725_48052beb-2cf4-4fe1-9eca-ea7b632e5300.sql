
-- 1. Add is_featured to profiles for admin curation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- 2. Replace public_profiles view (no email; only profiles with a slug are public)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id, slug, display_name, artist_name, avatar_url, bio, account_type,
  location, top_audience_location, avg_engagement, avg_reach,
  monthly_streams, total_streams, total_followers, socials, values,
  is_featured, created_at
FROM public.profiles
WHERE slug IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. Remove the policy that exposed email publicly. Authenticated users keep
--    access to their own row; admins keep full access. Public read of safe
--    columns now goes through the public_profiles view.
DROP POLICY IF EXISTS "Profiles with a slug are publicly viewable" ON public.profiles;

-- 4. Allow admins to update is_featured (admin update policy)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
