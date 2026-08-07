CREATE TABLE public.social_listening_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name text NOT NULL,
  platform text NOT NULL DEFAULT 'Instagram',
  handle text NOT NULL,
  posts jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_listening_scans TO authenticated;
GRANT ALL ON public.social_listening_scans TO service_role;

ALTER TABLE public.social_listening_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view social listening scans"
  ON public.social_listening_scans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create social listening scans"
  ON public.social_listening_scans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update social listening scans"
  ON public.social_listening_scans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete social listening scans"
  ON public.social_listening_scans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_listening_scans_touch_updated_at
  BEFORE UPDATE ON public.social_listening_scans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX social_listening_scans_created_at_idx
  ON public.social_listening_scans (created_at DESC);