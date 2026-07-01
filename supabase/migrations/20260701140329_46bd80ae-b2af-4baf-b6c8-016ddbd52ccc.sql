
-- 1. Restrict anon SELECT on email columns for campaign_reports
REVOKE SELECT (client_email, brand_email) ON public.campaign_reports FROM anon;

-- 2. Restrict anon+authenticated SELECT on email columns for rosters
-- (keep authenticated so owners/admins can still read via full-column selects; only anon exposes on the public "Anyone can view published rosters" policy)
REVOKE SELECT (client_email, brand_email) ON public.rosters FROM anon;

-- 3. Revoke public EXECUTE on SECURITY DEFINER email queue functions (cron/internal only)
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

-- 4. Spotlight images bucket: intentionally public. Add an explicit SELECT policy to document accepted public read.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read access to spotlight-images'
  ) THEN
    CREATE POLICY "Public read access to spotlight-images"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'spotlight-images');
  END IF;
END $$;
