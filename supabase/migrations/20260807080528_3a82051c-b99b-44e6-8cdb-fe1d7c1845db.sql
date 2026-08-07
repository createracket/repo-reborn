ALTER TABLE public.social_listening_scans
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_title text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS social_listening_scans_saved_idx
  ON public.social_listening_scans (saved, created_at DESC);