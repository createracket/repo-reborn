ALTER TABLE public.roster_items ADD COLUMN IF NOT EXISTS co_posts jsonb NOT NULL DEFAULT '[]'::jsonb;
GRANT SELECT (co_posts) ON public.roster_items TO anon, authenticated;