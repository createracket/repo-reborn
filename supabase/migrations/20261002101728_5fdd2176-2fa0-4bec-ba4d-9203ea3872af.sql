ALTER TABLE public.talent_intake_requests
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard','advanced')),
  ADD COLUMN IF NOT EXISTS ai_draft_count integer NOT NULL DEFAULT 0;