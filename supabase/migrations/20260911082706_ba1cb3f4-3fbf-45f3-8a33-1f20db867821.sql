ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.admin_tasks
)
UPDATE public.admin_tasks t SET sort_order = ranked.rn FROM ranked WHERE ranked.id = t.id;