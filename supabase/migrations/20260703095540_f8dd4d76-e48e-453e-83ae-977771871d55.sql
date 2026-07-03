
ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS transparency text;

ALTER TABLE public.lead_briefs
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS transparency text;

ALTER TABLE public.campaign_briefs
  DROP CONSTRAINT IF EXISTS campaign_briefs_currency_check,
  ADD CONSTRAINT campaign_briefs_currency_check CHECK (currency IN ('AUD','GBP','USD'));

ALTER TABLE public.lead_briefs
  DROP CONSTRAINT IF EXISTS lead_briefs_currency_check,
  ADD CONSTRAINT lead_briefs_currency_check CHECK (currency IN ('AUD','GBP','USD'));

ALTER TABLE public.campaign_briefs
  DROP CONSTRAINT IF EXISTS campaign_briefs_transparency_check,
  ADD CONSTRAINT campaign_briefs_transparency_check CHECK (transparency IS NULL OR transparency IN ('early_planning','budget_pending','locked_in','live'));

ALTER TABLE public.lead_briefs
  DROP CONSTRAINT IF EXISTS lead_briefs_transparency_check,
  ADD CONSTRAINT lead_briefs_transparency_check CHECK (transparency IS NULL OR transparency IN ('early_planning','budget_pending','locked_in','live'));
