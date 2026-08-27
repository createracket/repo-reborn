ALTER TABLE public.roster_items ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
GRANT SELECT (hidden) ON public.roster_items TO anon, authenticated;
GRANT UPDATE (hidden), INSERT (hidden) ON public.roster_items TO authenticated;