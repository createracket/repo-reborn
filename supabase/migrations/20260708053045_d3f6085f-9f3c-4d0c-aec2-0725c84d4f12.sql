ALTER TABLE public.roster_items ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.rosters ADD COLUMN IF NOT EXISTS allow_multi_category boolean NOT NULL DEFAULT false;

-- Backfill: seed the new array from the existing single category so nothing looks empty.
UPDATE public.roster_items SET categories = ARRAY[category] WHERE category IS NOT NULL AND (categories IS NULL OR array_length(categories, 1) IS NULL);