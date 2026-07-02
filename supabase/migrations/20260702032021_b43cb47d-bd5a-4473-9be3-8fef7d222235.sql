-- Revoke column-level SELECT on sensitive assignment emails from anon and authenticated
REVOKE SELECT (brand_email, client_email) ON public.rosters FROM anon;
REVOKE SELECT (brand_email, client_email) ON public.rosters FROM authenticated;
REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM anon;
REVOKE SELECT (brand_email, client_email) ON public.campaign_reports FROM authenticated;

-- service_role retains full access via GRANT ALL previously granted; make sure it's there.
GRANT SELECT (brand_email, client_email), INSERT (brand_email, client_email), UPDATE (brand_email, client_email) ON public.rosters TO service_role;
GRANT SELECT (brand_email, client_email), INSERT (brand_email, client_email), UPDATE (brand_email, client_email) ON public.campaign_reports TO service_role;

-- Owners/admins can still write these columns from the app (authenticated).
GRANT INSERT (brand_email, client_email), UPDATE (brand_email, client_email) ON public.rosters TO authenticated;
GRANT INSERT (brand_email, client_email), UPDATE (brand_email, client_email) ON public.campaign_reports TO authenticated;

-- Owner/admin-only helper: fetch a roster's assignment emails (used by the roster builder to prefill the form)
CREATE OR REPLACE FUNCTION public.get_roster_assignment(_roster_id uuid)
RETURNS TABLE(client_email text, brand_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.client_email, r.brand_email
  FROM public.rosters r
  WHERE r.id = _roster_id
    AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

REVOKE ALL ON FUNCTION public.get_roster_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_roster_assignment(uuid) TO authenticated;

-- Owner/admin-only helper: fetch a campaign report's assignment emails
CREATE OR REPLACE FUNCTION public.get_campaign_report_assignment(_report_id uuid)
RETURNS TABLE(client_email text, brand_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.client_email, r.brand_email
  FROM public.campaign_reports r
  WHERE r.id = _report_id
    AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

REVOKE ALL ON FUNCTION public.get_campaign_report_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_report_assignment(uuid) TO authenticated;

-- Storage: constrain reads of the public 'avatars' bucket via an explicit SELECT policy.
-- Bucket remains public so avatars still resolve from public URLs; policy documents intent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read access to avatars bucket'
  ) THEN
    CREATE POLICY "Public read access to avatars bucket"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;