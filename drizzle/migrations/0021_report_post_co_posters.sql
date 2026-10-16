ALTER TABLE public.campaign_report_posts ADD COLUMN IF NOT EXISTS co_posters jsonb NOT NULL DEFAULT '[]'::jsonb;
GRANT SELECT (co_posters) ON public.campaign_report_posts TO anon, authenticated;
GRANT UPDATE (co_posters), INSERT (co_posters) ON public.campaign_report_posts TO authenticated;