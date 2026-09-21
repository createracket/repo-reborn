CREATE TABLE public.scheduled_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipients text[] NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  result jsonb,
  processed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_email_sends_status_check CHECK (status IN ('scheduled','processing','sent','cancelled','failed')),
  CONSTRAINT scheduled_email_sends_recipients_check CHECK (cardinality(recipients) BETWEEN 1 AND 50)
);

CREATE INDEX scheduled_email_sends_due_idx ON public.scheduled_email_sends (status, send_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_email_sends TO authenticated;
GRANT ALL ON public.scheduled_email_sends TO service_role;

ALTER TABLE public.scheduled_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled email sends"
ON public.scheduled_email_sends
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER scheduled_email_sends_touch_updated_at
BEFORE UPDATE ON public.scheduled_email_sends
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();