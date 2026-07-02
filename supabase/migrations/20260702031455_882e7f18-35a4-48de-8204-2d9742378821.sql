ALTER TABLE public.campaign_report_creators ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.campaign_report_creators DROP CONSTRAINT IF EXISTS campaign_report_creators_location_check;
ALTER TABLE public.campaign_report_creators ADD CONSTRAINT campaign_report_creators_location_check
  CHECK (location IS NULL OR location IN ('GB','US','NZ','AU'));