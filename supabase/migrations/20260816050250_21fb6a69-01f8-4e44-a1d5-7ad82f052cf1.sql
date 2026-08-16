ALTER TABLE public.campaign_briefs ADD COLUMN IF NOT EXISTS thumbnail_url text;

DROP FUNCTION IF EXISTS public.get_assigned_rosters();
CREATE OR REPLACE FUNCTION public.get_assigned_rosters()
 RETURNS TABLE(id uuid, owner_id uuid, title text, slug text, description text, published boolean, published_at timestamp with time zone, header_image_url text, profile_image_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.owner_id, r.title, r.slug, r.description, r.published,
         r.published_at, r.header_image_url, r.profile_image_url, r.created_at, r.updated_at
  FROM public.rosters r
  WHERE
    (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR
    (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY r.updated_at DESC;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_assigned_rosters() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_assigned_rosters() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_assigned_campaign_reports();
CREATE OR REPLACE FUNCTION public.get_assigned_campaign_reports()
 RETURNS TABLE(id uuid, owner_id uuid, title text, description text, slug text, published boolean, published_at timestamp with time zone, header_image_url text, profile_image_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.owner_id, r.title, r.description, r.slug, r.published,
         r.published_at, r.header_image_url, r.profile_image_url, r.created_at, r.updated_at
  FROM public.campaign_reports r
  WHERE
    (r.client_email IS NOT NULL AND lower(r.client_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR
    (r.brand_email IS NOT NULL AND lower(r.brand_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY r.updated_at DESC;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_assigned_campaign_reports() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_assigned_campaign_reports() TO authenticated, service_role;