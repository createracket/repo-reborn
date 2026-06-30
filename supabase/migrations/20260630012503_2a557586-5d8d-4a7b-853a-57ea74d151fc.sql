REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, display_name, avatar_url, account_type, bio, socials, values,
  slug, artist_name, location, total_followers, total_streams,
  monthly_streams, avg_reach, avg_engagement, top_audience_location,
  is_featured, created_at, updated_at
) ON public.profiles TO authenticated;