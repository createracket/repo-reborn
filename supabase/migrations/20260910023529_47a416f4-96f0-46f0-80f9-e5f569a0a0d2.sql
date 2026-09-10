CREATE TABLE public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'todo',
  due_date date,
  link_url text,
  related_label text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
GRANT ALL ON public.admin_tasks TO service_role;

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own tasks"
ON public.admin_tasks
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX admin_tasks_user_idx ON public.admin_tasks (user_id, position, created_at);

CREATE TRIGGER admin_tasks_updated_at
BEFORE UPDATE ON public.admin_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();