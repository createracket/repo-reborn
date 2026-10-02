CREATE TABLE public.talent_intake_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  artist_name text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  partner_page_id uuid REFERENCES public.partner_pages(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_intake_requests TO authenticated;
GRANT ALL ON public.talent_intake_requests TO service_role;
ALTER TABLE public.talent_intake_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage talent intake" ON public.talent_intake_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER talent_intake_touch BEFORE UPDATE ON public.talent_intake_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();