
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS bot_reason text;

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_country_idx ON public.page_views (country);
CREATE INDEX IF NOT EXISTS page_views_is_bot_idx ON public.page_views (is_bot);
