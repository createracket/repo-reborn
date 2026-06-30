
ALTER TABLE public.rosters
  ADD COLUMN brief_id uuid REFERENCES public.campaign_briefs(id) ON DELETE SET NULL;

CREATE INDEX rosters_brief_id_idx ON public.rosters(brief_id);
