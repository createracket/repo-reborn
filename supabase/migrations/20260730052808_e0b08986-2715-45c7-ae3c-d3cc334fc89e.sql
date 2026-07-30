CREATE TABLE public.usage_events (
  user_id uuid NOT NULL,
  action text NOT NULL,
  period text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  bonus integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action, period)
);

GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON public.usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all usage" ON public.usage_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.usage_limits (
  action text PRIMARY KEY,
  monthly_limit integer NOT NULL,
  label text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usage_limits TO authenticated;
GRANT ALL ON public.usage_limits TO service_role;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in reads limits" ON public.usage_limits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage limits" ON public.usage_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.usage_limits (action, monthly_limit, label) VALUES
  ('profile_sync', 1, 'Profile sync'),
  ('vibe_intro', 3, 'Vibe check intro parse'),
  ('voice_note', 3, 'Brief voice note transcription');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usage_blocked boolean NOT NULL DEFAULT false;