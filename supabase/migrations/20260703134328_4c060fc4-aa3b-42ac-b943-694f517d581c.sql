ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS linked_roster_id uuid REFERENCES public.rosters(id) ON DELETE SET NULL;

ALTER TABLE public.lead_briefs
  ADD COLUMN IF NOT EXISTS linked_roster_id uuid REFERENCES public.rosters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaign_briefs_linked_roster_id_idx ON public.campaign_briefs(linked_roster_id);
CREATE INDEX IF NOT EXISTS lead_briefs_linked_roster_id_idx ON public.lead_briefs(linked_roster_id);