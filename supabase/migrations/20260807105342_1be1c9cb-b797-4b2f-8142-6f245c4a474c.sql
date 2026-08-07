ALTER TABLE public.campaign_briefs ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.lead_briefs ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;