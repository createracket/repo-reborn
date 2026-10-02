ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
GRANT SELECT (archived) ON public.rosters TO authenticated, anon;
GRANT UPDATE (archived) ON public.rosters TO authenticated;