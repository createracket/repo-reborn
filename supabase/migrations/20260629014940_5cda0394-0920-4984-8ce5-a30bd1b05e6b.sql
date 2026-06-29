
CREATE TABLE public.page_views (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID
);

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_session_idx ON public.page_views (session_id, created_at);
CREATE INDEX page_views_path_idx ON public.page_views (path);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.page_views_id_seq TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may log a pageview
CREATE POLICY "Anyone can log pageviews"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can view pageviews"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
