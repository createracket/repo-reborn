CREATE TABLE public.brief_form_config (
  id text NOT NULL PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brief_form_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.brief_form_config TO authenticated;
GRANT ALL ON public.brief_form_config TO service_role;

ALTER TABLE public.brief_form_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brief form config"
ON public.brief_form_config FOR SELECT
USING (true);

CREATE POLICY "Admins can insert brief form config"
ON public.brief_form_config FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brief form config"
ON public.brief_form_config FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));