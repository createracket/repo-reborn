
DROP VIEW IF EXISTS public.campaign_reports_assigned;
DROP VIEW IF EXISTS public.rosters_assigned;

CREATE OR REPLACE FUNCTION public.get_assigned_campaign_reports()
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  slug text,
  published boolean,
  published_at timestamptz,
  header_image_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.owner_id, r.title, r.description, r.slug, r.published,
         r.published_at, r.header_image_url, r.created_at, r.updated_at
  FROM public.campaign_reports r
  WHERE
    (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR
    (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY r.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_assigned_rosters()
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  title text,
  slug text,
  description text,
  published boolean,
  published_at timestamptz,
  header_image_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.owner_id, r.title, r.slug, r.description, r.published,
         r.published_at, r.header_image_url, r.created_at, r.updated_at
  FROM public.rosters r
  WHERE
    (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR
    (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY r.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_assigned_campaign_reports() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_assigned_rosters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assigned_campaign_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assigned_rosters() TO authenticated;
