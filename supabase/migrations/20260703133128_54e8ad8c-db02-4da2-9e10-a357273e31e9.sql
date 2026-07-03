
-- Add "live for all dashboards" flag to spotlights
ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS dashboard_visible boolean NOT NULL DEFAULT false;

-- Per-user targeting of spotlights on dashboards
CREATE TABLE IF NOT EXISTS public.partner_page_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_page_id uuid NOT NULL REFERENCES public.partner_pages(id) ON DELETE CASCADE,
  target_user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_page_shares_target_ck CHECK (target_user_id IS NOT NULL OR target_email IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_page_shares_page_user_uk
  ON public.partner_page_shares(partner_page_id, target_user_id)
  WHERE target_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS partner_page_shares_page_email_uk
  ON public.partner_page_shares(partner_page_id, lower(target_email))
  WHERE target_email IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_page_shares TO authenticated;
GRANT ALL ON public.partner_page_shares TO service_role;

ALTER TABLE public.partner_page_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner page shares"
  ON public.partner_page_shares
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see their own partner page shares"
  ON public.partner_page_shares
  FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR (target_email IS NOT NULL AND lower(target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  );
