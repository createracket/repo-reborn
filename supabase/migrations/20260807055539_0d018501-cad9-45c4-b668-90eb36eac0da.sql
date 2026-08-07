ALTER TABLE public.roster_items
  ADD COLUMN IF NOT EXISTS twitch_url text,
  ADD COLUMN IF NOT EXISTS twitch_followers integer,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS facebook_followers integer,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS x_followers integer,
  ADD COLUMN IF NOT EXISTS custom_label text,
  ADD COLUMN IF NOT EXISTS custom_url text,
  ADD COLUMN IF NOT EXISTS custom_followers integer;