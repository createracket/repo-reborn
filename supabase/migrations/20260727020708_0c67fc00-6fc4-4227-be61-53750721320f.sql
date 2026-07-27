ALTER TABLE public.campaign_reports ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'original';

CREATE OR REPLACE VIEW public.public_campaign_reports AS
SELECT id, owner_id, title, description, slug, published, published_at, header_image_url, created_at, updated_at, categories, hide_categories, template
FROM public.campaign_reports
WHERE published = true;