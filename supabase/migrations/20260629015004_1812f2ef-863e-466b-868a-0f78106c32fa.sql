
DROP POLICY IF EXISTS "Anyone can log pageviews" ON public.page_views;

CREATE POLICY "Anyone can log pageviews"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(session_id) BETWEEN 8 AND 64
    AND length(path) BETWEEN 1 AND 512
    AND (referrer IS NULL OR length(referrer) <= 1024)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
    AND is_bot = FALSE
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );
