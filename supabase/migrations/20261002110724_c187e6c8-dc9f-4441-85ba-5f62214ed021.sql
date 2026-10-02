CREATE TABLE public.spotlight_view_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_page_id uuid NOT NULL REFERENCES public.partner_pages(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  requester_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (partner_page_id, requester_id)
);
GRANT SELECT ON public.spotlight_view_requests TO authenticated;
GRANT UPDATE (status, decided_at, requester_seen) ON public.spotlight_view_requests TO authenticated;
GRANT INSERT, DELETE ON public.spotlight_view_requests TO authenticated;
GRANT ALL ON public.spotlight_view_requests TO service_role;
ALTER TABLE public.spotlight_view_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or owned requests" ON public.spotlight_view_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner, requester or admin update" ON public.spotlight_view_requests FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR requester_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert requests" ON public.spotlight_view_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete requests" ON public.spotlight_view_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Requesters may only change requester_seen; owners/admins decide status.
CREATE OR REPLACE FUNCTION public.guard_spotlight_request_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() = OLD.owner_id OR auth.uid() IS NULL THEN
    IF NEW.status NOT IN ('pending','approved','declined') THEN RAISE EXCEPTION 'Invalid status'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.decided_at := now(); NEW.requester_seen := false; END IF;
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.decided_at := OLD.decided_at;
  RETURN NEW;
END;
$$;
CREATE TRIGGER spotlight_view_requests_guard BEFORE UPDATE ON public.spotlight_view_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_spotlight_request_update();
REVOKE EXECUTE ON FUNCTION public.guard_spotlight_request_update() FROM PUBLIC, anon, authenticated;

-- Signed-in users ask to view a linked spotlight.
CREATE OR REPLACE FUNCTION public.request_spotlight_view(_page_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner uuid; _status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to request access'; END IF;
  SELECT pp.linked_user_id INTO _owner FROM public.partner_pages pp
    JOIN public.profiles p ON p.id = pp.linked_user_id
    WHERE pp.id = _page_id AND pp.published AND NOT pp.archived AND p.can_spotlight;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Spotlight not available'; END IF;
  INSERT INTO public.spotlight_view_requests (partner_page_id, requester_id, owner_id)
    VALUES (_page_id, auth.uid(), _owner)
    ON CONFLICT (partner_page_id, requester_id) DO NOTHING;
  SELECT status INTO _status FROM public.spotlight_view_requests WHERE partner_page_id = _page_id AND requester_id = auth.uid();
  RETURN _status;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_spotlight_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_spotlight_view(uuid) TO authenticated;

-- Profile previews: slug only revealed to owner, admin, or approved requesters.
DROP FUNCTION IF EXISTS public.get_profile_spotlights(uuid);
CREATE FUNCTION public.get_profile_spotlights(_profile_id uuid)
 RETURNS TABLE(id uuid, slug text, headline text, subtitle text, header_image_url text, access text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT pp.id,
    CASE WHEN a.access IN ('owner','approved') THEN pp.slug END,
    pp.headline, pp.subtitle, pp.header_image_url, a.access
  FROM public.partner_pages pp
  JOIN public.profiles p ON p.id = pp.linked_user_id
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN auth.uid() = pp.linked_user_id OR public.has_role(auth.uid(), 'admin') THEN 'owner'
      ELSE COALESCE((SELECT r.status FROM public.spotlight_view_requests r
                     WHERE r.partner_page_id = pp.id AND r.requester_id = auth.uid()), 'none')
    END AS access
  ) a
  WHERE pp.linked_user_id = _profile_id
    AND p.can_spotlight AND pp.published AND NOT pp.archived
    AND auth.uid() IS NOT NULL
  ORDER BY pp.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_spotlights(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_spotlights(uuid) TO authenticated;