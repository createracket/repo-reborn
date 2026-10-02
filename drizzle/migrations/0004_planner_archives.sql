CREATE TABLE public.planner_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);
GRANT SELECT, INSERT, DELETE ON public.planner_archives TO authenticated;
GRANT ALL ON public.planner_archives TO service_role;
ALTER TABLE public.planner_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own planner archives select" ON public.planner_archives FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own planner archives insert" ON public.planner_archives FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own planner archives delete" ON public.planner_archives FOR DELETE TO authenticated USING (auth.uid() = user_id);