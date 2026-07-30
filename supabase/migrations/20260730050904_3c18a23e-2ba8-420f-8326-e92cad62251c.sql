ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS access_code_label text;

CREATE TABLE IF NOT EXISTS public.spotlight_access_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_page_id uuid NOT NULL REFERENCES public.partner_pages(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.spotlight_access_leads TO authenticated;
GRANT ALL ON public.spotlight_access_leads TO service_role;

ALTER TABLE public.spotlight_access_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view spotlight leads"
  ON public.spotlight_access_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Published partner pages are publicly viewable" ON public.partner_pages;

CREATE POLICY "Ungated published partner pages are publicly viewable"
  ON public.partner_pages
  FOR SELECT
  TO anon
  USING (published = true AND access_code IS NULL);

CREATE POLICY "Members view published partner pages they can access"
  ON public.partner_pages
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND (
      access_code IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.partner_page_shares s
        WHERE s.partner_page_id = partner_pages.id
          AND (
            s.target_user_id = auth.uid()
            OR (s.target_email IS NOT NULL
                AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
          )
      )
    )
  );