
ALTER TABLE public.rosters
  ADD COLUMN IF NOT EXISTS hide_prospect_tags boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS header_image_url text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS brand_email text;

ALTER TABLE public.roster_items
  ADD COLUMN IF NOT EXISTS budget numeric;

-- Allow assigned client/brand emails to view the roster
CREATE POLICY "Assigned client or brand can view roster"
  ON public.rosters
  FOR SELECT TO authenticated
  USING (
    (client_email IS NOT NULL AND lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (brand_email IS NOT NULL AND lower(brand_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );

CREATE POLICY "Assigned client or brand can view roster items"
  ON public.roster_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rosters r
    WHERE r.id = roster_items.roster_id
      AND (
        (r.client_email IS NOT NULL AND lower(r.client_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
        OR (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      )
  ));

CREATE INDEX IF NOT EXISTS rosters_client_email_idx ON public.rosters(lower(client_email));
CREATE INDEX IF NOT EXISTS rosters_brand_email_idx ON public.rosters(lower(brand_email));
