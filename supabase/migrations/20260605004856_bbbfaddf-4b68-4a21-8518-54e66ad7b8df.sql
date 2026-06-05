
ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Allow any authenticated user (artists) to see published briefs as opportunities
DROP POLICY IF EXISTS "Authenticated users can view published briefs" ON public.campaign_briefs;
CREATE POLICY "Authenticated users can view published briefs"
  ON public.campaign_briefs
  FOR SELECT
  TO authenticated
  USING (published = true);

-- Allow admins to update any brief (e.g. to publish/unpublish)
DROP POLICY IF EXISTS "Admins can update all campaign briefs" ON public.campaign_briefs;
CREATE POLICY "Admins can update all campaign briefs"
  ON public.campaign_briefs
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
