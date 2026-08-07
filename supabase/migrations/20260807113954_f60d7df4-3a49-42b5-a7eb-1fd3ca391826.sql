ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS profile_image_url text;

DROP VIEW IF EXISTS public.public_campaign_reports;
CREATE VIEW public.public_campaign_reports
WITH (security_invoker = true)
AS
SELECT r.id, r.title, r.description, r.slug, r.published, r.published_at,
       r.header_image_url, r.profile_image_url, r.categories, r.hide_categories,
       r.template, r.created_at, r.updated_at
FROM public.campaign_reports r
WHERE r.published = true AND r.access_code IS NULL;

GRANT SELECT ON public.public_campaign_reports TO anon, authenticated;