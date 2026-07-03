ALTER TABLE public.roster_items
  ADD COLUMN IF NOT EXISTS apple_music_url text,
  ADD COLUMN IF NOT EXISTS apple_music_followers numeric;

-- Update anon column-level grant to include new fields
REVOKE SELECT ON public.roster_items FROM anon;
GRANT SELECT (
  id, roster_id, kind, name, avatar_url,
  instagram_url, instagram_followers,
  tiktok_url, tiktok_followers,
  youtube_url, youtube_subscribers,
  spotify_url, spotify_monthly_listens,
  apple_music_url, apple_music_followers,
  example_video_url, bio_page_url, content_review_url,
  position, status, category, location, metrics_month,
  created_at, updated_at
) ON public.roster_items TO anon;