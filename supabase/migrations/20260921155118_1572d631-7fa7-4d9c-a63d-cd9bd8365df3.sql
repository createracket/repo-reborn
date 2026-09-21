CREATE TABLE public.scheduled_email_cron_token (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.scheduled_email_cron_token (id) VALUES (true);

GRANT ALL ON public.scheduled_email_cron_token TO service_role;

ALTER TABLE public.scheduled_email_cron_token ENABLE ROW LEVEL SECURITY;