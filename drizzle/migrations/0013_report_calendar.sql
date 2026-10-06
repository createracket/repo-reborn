ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS show_calendar boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS calendar_events jsonb NOT NULL DEFAULT '[]';
GRANT SELECT (show_calendar, calendar_events) ON public.campaign_reports TO anon;
GRANT SELECT (show_calendar, calendar_events), UPDATE (show_calendar, calendar_events) ON public.campaign_reports TO authenticated;
GRANT SELECT (show_calendar, calendar_events), UPDATE (show_calendar, calendar_events) ON public.campaign_reports TO service_role;
ALTER TABLE public.campaign_report_creators ADD COLUMN IF NOT EXISTS posting_date date;
ALTER TABLE public.campaign_report_creators ADD COLUMN IF NOT EXISTS extra_posting_dates text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE VIEW public.public_campaign_reports WITH (security_invoker = true) AS
 SELECT id, title, description, slug, published, published_at, header_image_url, profile_image_url,
    categories, hide_categories, template, created_at, updated_at, custom_links, show_calendar, calendar_events
   FROM public.campaign_reports r
  WHERE published = true AND access_code IS NULL;