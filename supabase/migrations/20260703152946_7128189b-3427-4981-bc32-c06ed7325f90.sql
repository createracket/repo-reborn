
-- Fix: infinite recursion between campaign_briefs and campaign_brief_shares policies.
-- The previous owner policies on campaign_brief_shares selected from campaign_briefs,
-- whose "Recipients can view privately shared campaign briefs" policy selects back
-- into campaign_brief_shares, causing 42P17 on every campaign_briefs read.

CREATE OR REPLACE FUNCTION public.is_campaign_brief_owner(_brief_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_briefs b
    WHERE b.id = _brief_id AND b.user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_campaign_brief_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_brief_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Brief owners view shares for their briefs" ON public.campaign_brief_shares;
DROP POLICY IF EXISTS "Brief owners insert shares for their briefs" ON public.campaign_brief_shares;
DROP POLICY IF EXISTS "Brief owners update shares for their briefs" ON public.campaign_brief_shares;
DROP POLICY IF EXISTS "Brief owners delete shares for their briefs" ON public.campaign_brief_shares;

CREATE POLICY "Brief owners view shares for their briefs"
  ON public.campaign_brief_shares
  FOR SELECT
  TO authenticated
  USING (brief_source = 'user' AND public.is_campaign_brief_owner(brief_id, auth.uid()));

CREATE POLICY "Brief owners insert shares for their briefs"
  ON public.campaign_brief_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (brief_source = 'user' AND public.is_campaign_brief_owner(brief_id, auth.uid()));

CREATE POLICY "Brief owners update shares for their briefs"
  ON public.campaign_brief_shares
  FOR UPDATE
  TO authenticated
  USING (brief_source = 'user' AND public.is_campaign_brief_owner(brief_id, auth.uid()))
  WITH CHECK (brief_source = 'user' AND public.is_campaign_brief_owner(brief_id, auth.uid()));

CREATE POLICY "Brief owners delete shares for their briefs"
  ON public.campaign_brief_shares
  FOR DELETE
  TO authenticated
  USING (brief_source = 'user' AND public.is_campaign_brief_owner(brief_id, auth.uid()));
