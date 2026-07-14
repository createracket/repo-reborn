ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS artist_archetypes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_archetypes text[] NOT NULL DEFAULT '{}';