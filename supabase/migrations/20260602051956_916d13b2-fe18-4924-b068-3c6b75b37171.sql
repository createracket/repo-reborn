CREATE TABLE public.vibe_check_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.vibe_check_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vibe_check_config TO authenticated;
GRANT ALL ON public.vibe_check_config TO service_role;

ALTER TABLE public.vibe_check_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vibe check config"
ON public.vibe_check_config FOR SELECT
USING (true);

CREATE POLICY "Admins can insert vibe check config"
ON public.vibe_check_config FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vibe check config"
ON public.vibe_check_config FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.vibe_check_config (id, config) VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;