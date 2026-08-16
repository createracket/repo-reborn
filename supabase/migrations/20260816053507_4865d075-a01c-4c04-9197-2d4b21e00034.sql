ALTER TABLE public.social_listening_scans
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumb_frame jsonb;