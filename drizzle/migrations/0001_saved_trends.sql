CREATE TABLE public.saved_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trend_id text NOT NULL,
  trend_title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trend_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_trends TO authenticated;
GRANT ALL ON public.saved_trends TO service_role;
ALTER TABLE public.saved_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own saved trends" ON public.saved_trends FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users save trends" ON public.saved_trends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave trends" ON public.saved_trends FOR DELETE TO authenticated USING (auth.uid() = user_id);