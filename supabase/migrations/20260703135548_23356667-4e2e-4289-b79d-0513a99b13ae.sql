
-- Fix: revoke anon EXECUTE on SECURITY DEFINER functions that should require sign-in
REVOKE EXECUTE ON FUNCTION public.get_campaign_brief_contact_email(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_campaign_brief_emails() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_brief_contact_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_brief_emails() TO authenticated;

-- Fix: harden rosters.client_email / brand_email column-level access
-- Explicitly revoke column-level SELECT so a future broad GRANT cannot expose them.
REVOKE SELECT (client_email, brand_email) ON public.rosters FROM anon, authenticated, PUBLIC;

-- Route assigned-viewer checks through a SECURITY DEFINER helper so the
-- roster_items policy no longer needs to reference email columns directly.
CREATE OR REPLACE FUNCTION public.is_assigned_to_roster(_roster_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rosters r
    WHERE r.id = _roster_id
      AND (
        (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        OR
        (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_assigned_to_roster(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_roster(uuid) TO authenticated;

DROP POLICY IF EXISTS "Assigned client or brand can view roster items" ON public.roster_items;
CREATE POLICY "Assigned client or brand can view roster items"
ON public.roster_items
FOR SELECT
TO authenticated
USING (public.is_assigned_to_roster(roster_id));
