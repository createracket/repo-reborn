
-- 1. spotlight_images_any_authenticated_upload: drop broad authenticated write policies
DROP POLICY IF EXISTS "Authenticated users can upload spotlight images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update spotlight images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete spotlight images" ON storage.objects;

-- 2. SUPA_public_bucket_allows_listing: drop the broad SELECT on the public
-- spotlight-images bucket so clients can't enumerate all files. Public bucket
-- files remain readable via their direct public URLs (CDN).
DROP POLICY IF EXISTS "Public can read spotlight images" ON storage.objects;

-- 3. campaign_reports_no_published_public_select: add a public SELECT policy so
-- anon/authenticated can discover published reports directly on the reports table.
CREATE POLICY "Anyone views published campaign reports"
  ON public.campaign_reports
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- 4. campaign_reports_assignee_read_email_columns: route assignee checks through
-- a SECURITY DEFINER helper (mirrors is_assigned_to_roster) so the email match
-- happens inside a definer function rather than an inline policy join that
-- surfaces email columns to the RLS planner.
CREATE OR REPLACE FUNCTION public.is_assigned_to_campaign_report(_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_reports r
    WHERE r.id = _report_id
      AND (
        (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        OR
        (r.brand_email  IS NOT NULL AND lower(r.brand_email)  = lower(COALESCE(auth.jwt() ->> 'email', '')))
      )
  )
$$;

DROP POLICY IF EXISTS "Assigned emails view creators on their reports" ON public.campaign_report_creators;
CREATE POLICY "Assigned emails view creators on their reports"
  ON public.campaign_report_creators
  FOR SELECT
  TO authenticated
  USING (public.is_assigned_to_campaign_report(report_id));

DROP POLICY IF EXISTS "Assigned emails view posts on their reports" ON public.campaign_report_posts;
CREATE POLICY "Assigned emails view posts on their reports"
  ON public.campaign_report_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_report_creators c
      WHERE c.id = campaign_report_posts.creator_id
        AND public.is_assigned_to_campaign_report(c.report_id)
    )
  );
