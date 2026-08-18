ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS statuses text[] NOT NULL DEFAULT '{}'::text[];
GRANT SELECT(statuses) ON public.rosters TO anon, authenticated;