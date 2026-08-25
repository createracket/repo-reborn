CREATE TABLE public.partner_page_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  saved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX partner_page_versions_page_idx ON public.partner_page_versions (page_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.partner_page_versions TO authenticated;
GRANT ALL ON public.partner_page_versions TO service_role;

ALTER TABLE public.partner_page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view page versions"
ON public.partner_page_versions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete page versions"
ON public.partner_page_versions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.capture_partner_page_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_page_versions (page_id, snapshot, saved_by)
  VALUES (OLD.id, to_jsonb(OLD), auth.uid());

  DELETE FROM public.partner_page_versions v
  WHERE v.page_id = OLD.id
    AND v.id NOT IN (
      SELECT id FROM public.partner_page_versions
      WHERE page_id = OLD.id
      ORDER BY created_at DESC
      LIMIT 30
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER partner_pages_capture_version
BEFORE UPDATE ON public.partner_pages
FOR EACH ROW
EXECUTE FUNCTION public.capture_partner_page_version();