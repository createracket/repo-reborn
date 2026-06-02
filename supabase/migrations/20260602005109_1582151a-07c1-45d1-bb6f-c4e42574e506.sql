-- Ensure updated_at helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.partner_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'podcast',
  headline TEXT NOT NULL,
  subtitle TEXT,
  intro TEXT,
  host_bio TEXT,
  partnership_pitch TEXT,
  eoi_opportunities TEXT[] NOT NULL DEFAULT '{}',
  audience_segments TEXT[] NOT NULL DEFAULT '{}',
  links JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_pages TO anon;
GRANT SELECT ON public.partner_pages TO authenticated;
GRANT ALL ON public.partner_pages TO service_role;

ALTER TABLE public.partner_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published partner pages are publicly viewable"
ON public.partner_pages
FOR SELECT
USING (published = true);

CREATE POLICY "Admins can view all partner pages"
ON public.partner_pages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert partner pages"
ON public.partner_pages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner pages"
ON public.partner_pages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partner pages"
ON public.partner_pages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partner_pages_updated_at
BEFORE UPDATE ON public.partner_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
