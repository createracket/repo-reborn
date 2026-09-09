CREATE OR REPLACE FUNCTION public.auth_verified_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN COALESCE((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false)
         AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    THEN lower(NULLIF(auth.jwt() ->> 'email', ''))
    ELSE NULL
  END
$$;

REVOKE EXECUTE ON FUNCTION public.auth_verified_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_verified_email() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_assigned_to_campaign_report(_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_reports r
    WHERE r.id = _report_id
      AND public.auth_verified_email() IS NOT NULL
      AND (
        lower(COALESCE(r.client_email, '')) = public.auth_verified_email()
        OR lower(COALESCE(r.brand_email, '')) = public.auth_verified_email()
      )
  )
$$;

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
      AND public.auth_verified_email() IS NOT NULL
      AND (
        lower(COALESCE(r.client_email, '')) = public.auth_verified_email()
        OR lower(COALESCE(r.brand_email, '')) = public.auth_verified_email()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_assigned_campaign_reports()
RETURNS TABLE(id uuid, owner_id uuid, title text, description text, slug text, published boolean, published_at timestamp with time zone, header_image_url text, profile_image_url text, thumb_frame jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.owner_id, r.title, r.description, r.slug, r.published,
         r.published_at, r.header_image_url, r.profile_image_url, r.thumb_frame, r.created_at, r.updated_at
  FROM public.campaign_reports r
  WHERE public.auth_verified_email() IS NOT NULL
    AND (
      lower(COALESCE(r.client_email, '')) = public.auth_verified_email()
      OR lower(COALESCE(r.brand_email, '')) = public.auth_verified_email()
    )
  ORDER BY r.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_assigned_rosters()
RETURNS TABLE(id uuid, owner_id uuid, title text, slug text, description text, published boolean, published_at timestamp with time zone, header_image_url text, profile_image_url text, thumb_frame jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.owner_id, r.title, r.slug, r.description, r.published,
         r.published_at, r.header_image_url, r.profile_image_url, r.thumb_frame, r.created_at, r.updated_at
  FROM public.rosters r
  WHERE public.auth_verified_email() IS NOT NULL
    AND (
      lower(COALESCE(r.client_email, '')) = public.auth_verified_email()
      OR lower(COALESCE(r.brand_email, '')) = public.auth_verified_email()
    )
  ORDER BY r.updated_at DESC;
$$;

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
                AND public.auth_verified_email() IS NOT NULL
                AND lower(s.target_email) = public.auth_verified_email())
          )
      )
    )
$$;