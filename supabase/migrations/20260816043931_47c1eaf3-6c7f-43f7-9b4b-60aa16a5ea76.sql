ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS dashboard_placement text NOT NULL DEFAULT 'planner';