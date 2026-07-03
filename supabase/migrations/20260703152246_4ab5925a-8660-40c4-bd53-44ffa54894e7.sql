
-- Reinforce column-level restriction on sensitive email fields for authenticated users on campaign_reports.
-- Column privileges already exclude these from any SELECT (including select=*), so the broad
-- "Authenticated users view published campaign reports" policy cannot expose emails.
REVOKE SELECT (client_email, brand_email) ON public.campaign_reports FROM authenticated, anon, PUBLIC;

-- Allow brief owners to manage shares on their own campaign briefs.
CREATE POLICY "Brief owners insert shares for their briefs"
  ON public.campaign_brief_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brief_source = 'user'
    AND EXISTS (
      SELECT 1 FROM public.campaign_briefs b
      WHERE b.id = campaign_brief_shares.brief_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Brief owners update shares for their briefs"
  ON public.campaign_brief_shares
  FOR UPDATE
  TO authenticated
  USING (
    brief_source = 'user'
    AND EXISTS (
      SELECT 1 FROM public.campaign_briefs b
      WHERE b.id = campaign_brief_shares.brief_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    brief_source = 'user'
    AND EXISTS (
      SELECT 1 FROM public.campaign_briefs b
      WHERE b.id = campaign_brief_shares.brief_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Brief owners delete shares for their briefs"
  ON public.campaign_brief_shares
  FOR DELETE
  TO authenticated
  USING (
    brief_source = 'user'
    AND EXISTS (
      SELECT 1 FROM public.campaign_briefs b
      WHERE b.id = campaign_brief_shares.brief_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Brief owners view shares for their briefs"
  ON public.campaign_brief_shares
  FOR SELECT
  TO authenticated
  USING (
    brief_source = 'user'
    AND EXISTS (
      SELECT 1 FROM public.campaign_briefs b
      WHERE b.id = campaign_brief_shares.brief_id
        AND b.user_id = auth.uid()
    )
  );
