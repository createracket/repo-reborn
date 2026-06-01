CREATE TABLE public.lead_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  budget numeric,
  timeline text,
  core_values text[] NOT NULL DEFAULT '{}',
  collaboration_types text[] NOT NULL DEFAULT '{}',
  target_audience text,
  contact_email text NOT NULL,
  contact_name text,
  company text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.lead_briefs TO anon, authenticated;
GRANT ALL ON public.lead_briefs TO service_role;

ALTER TABLE public.lead_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead brief"
  ON public.lead_briefs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(title) BETWEEN 2 AND 200
    AND length(description) BETWEEN 10 AND 5000
    AND length(contact_email) BETWEEN 3 AND 320
    AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );