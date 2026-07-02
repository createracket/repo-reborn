ALTER TABLE public.roster_items DROP CONSTRAINT IF EXISTS roster_items_category_check;
ALTER TABLE public.roster_items ADD CONSTRAINT roster_items_category_check
  CHECK (category IS NULL OR category IN ('musician','ugc','egc','music_fan','editorial','artist_exchange'));
ALTER TABLE public.roster_items ADD COLUMN IF NOT EXISTS content_review_url text;