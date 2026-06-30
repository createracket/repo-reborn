
ALTER TABLE public.rosters
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Allow anyone (including anon) to read a roster that has been published.
CREATE POLICY "Anyone can view published rosters"
ON public.rosters
FOR SELECT
TO anon, authenticated
USING (published = true AND slug IS NOT NULL);

-- And to read the items of a published roster.
CREATE POLICY "Anyone can view items of published rosters"
ON public.roster_items
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.rosters r
  WHERE r.id = roster_items.roster_id
    AND r.published = true
    AND r.slug IS NOT NULL
));

-- Ensure anon role can SELECT from these tables (RLS still gates rows).
GRANT SELECT ON public.rosters TO anon;
GRANT SELECT ON public.roster_items TO anon;
