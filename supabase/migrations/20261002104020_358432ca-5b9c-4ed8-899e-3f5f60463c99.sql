CREATE OR REPLACE FUNCTION public.get_profile_spotlights(_profile_id uuid)
 RETURNS TABLE(id uuid, slug text, headline text, subtitle text, header_image_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT pp.id, pp.slug, pp.headline, pp.subtitle, pp.header_image_url
  FROM public.partner_pages pp
  JOIN public.profiles p ON p.id = pp.linked_user_id
  WHERE pp.linked_user_id = _profile_id
    AND p.can_spotlight = true
    AND pp.published = true AND pp.archived = false AND pp.access_code IS NULL
  ORDER BY pp.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_spotlights(uuid) TO anon, authenticated;