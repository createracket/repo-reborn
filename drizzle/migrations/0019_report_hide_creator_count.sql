ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS hide_creator_count boolean NOT NULL DEFAULT false;

GRANT SELECT (hide_creator_count) ON TABLE public.campaign_reports TO anon, authenticated;
GRANT UPDATE (hide_creator_count) ON TABLE public.campaign_reports TO authenticated;

CREATE OR REPLACE VIEW public.public_campaign_reports AS
 SELECT id,
    title,
    description,
    slug,
    published,
    published_at,
    header_image_url,
    profile_image_url,
    categories,
    hide_categories,
    template,
    created_at,
    updated_at,
    custom_links,
    show_calendar,
    calendar_events,
    hide_creator_count
   FROM campaign_reports r
  WHERE published = true AND access_code IS NULL;