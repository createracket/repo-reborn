CREATE OR REPLACE VIEW public.public_campaign_reports
WITH (security_invoker = true) AS
SELECT id, owner_id, title, description, slug, published, published_at,
       header_image_url, created_at, updated_at, categories, hide_categories
FROM public.campaign_reports
WHERE published = true;
GRANT SELECT ON public.public_campaign_reports TO anon, authenticated;