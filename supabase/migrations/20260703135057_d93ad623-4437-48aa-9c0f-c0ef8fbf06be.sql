-- Remove direct column access to the sensitive contact_email on campaign_briefs.
REVOKE SELECT (contact_email) ON public.campaign_briefs FROM authenticated;
REVOKE SELECT (contact_email) ON public.campaign_briefs FROM anon;

-- Secure lookup: returns contact_email only for admins, the brief owner,
-- or a user the brief has been privately shared with.
CREATE OR REPLACE FUNCTION public.get_campaign_brief_contact_email(_brief_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.contact_email
  FROM public.campaign_briefs b
  WHERE b.id = _brief_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR b.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.campaign_brief_shares s
        WHERE s.brief_source = 'user'
          AND s.brief_id = b.id
          AND (
            s.target_user_id = auth.uid()
            OR (s.target_email IS NOT NULL
                AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
          )
      )
    )
$$;

-- Admin-only bulk fetch to keep the admin briefs list snappy.
CREATE OR REPLACE FUNCTION public.admin_campaign_brief_emails()
RETURNS TABLE(id uuid, contact_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.contact_email
  FROM public.campaign_briefs b
  WHERE public.has_role(auth.uid(), 'admin')
$$;

REVOKE EXECUTE ON FUNCTION public.get_campaign_brief_contact_email(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_campaign_brief_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_brief_contact_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_brief_emails() TO authenticated;