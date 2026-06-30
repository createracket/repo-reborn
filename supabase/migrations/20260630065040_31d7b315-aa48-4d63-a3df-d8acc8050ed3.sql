ALTER TABLE public.roster_items
  ADD COLUMN IF NOT EXISTS vibe text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill avatar_url for existing profile-kind items from community_profiles
UPDATE public.roster_items ri
SET avatar_url = cp.avatar_url
FROM public.community_profiles cp
WHERE ri.profile_id = cp.id
  AND ri.avatar_url IS NULL
  AND cp.avatar_url IS NOT NULL;