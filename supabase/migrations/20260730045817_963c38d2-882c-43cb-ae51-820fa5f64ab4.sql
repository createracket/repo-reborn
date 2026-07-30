ALTER TABLE public.rosters
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS access_code_label text;

CREATE TABLE IF NOT EXISTS public.roster_access_leads (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.roster_access_leads TO service_role;
GRANT SELECT ON public.roster_access_leads TO authenticated;
ALTER TABLE public.roster_access_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins view roster leads" ON public.roster_access_leads;
CREATE POLICY "Owners and admins view roster leads"
ON public.roster_access_leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.rosters r WHERE r.id = roster_id AND r.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view published rosters" ON public.rosters;
CREATE POLICY "Anyone can view published rosters"
ON public.rosters FOR SELECT
USING (published = true AND slug IS NOT NULL AND access_code IS NULL);

DROP POLICY IF EXISTS "Anyone can view items of published rosters" ON public.roster_items;
CREATE POLICY "Anyone can view items of published rosters"
ON public.roster_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rosters r
  WHERE r.id = roster_items.roster_id AND r.published = true AND r.slug IS NOT NULL AND r.access_code IS NULL
));