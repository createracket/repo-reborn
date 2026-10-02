ALTER TABLE public.partner_pages ADD COLUMN IF NOT EXISTS specific_dashboards_enabled boolean NOT NULL DEFAULT true;
GRANT SELECT (specific_dashboards_enabled), UPDATE (specific_dashboards_enabled) ON public.partner_pages TO authenticated;
GRANT SELECT (specific_dashboards_enabled) ON public.partner_pages TO anon;