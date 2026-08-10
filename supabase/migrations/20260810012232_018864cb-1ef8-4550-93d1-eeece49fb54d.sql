-- 1) Split public-read policies so anon never needs has_role()
DROP POLICY IF EXISTS "FAQs are publicly readable when published" ON public.faqs;
CREATE POLICY "Anyone can view published FAQs"
  ON public.faqs FOR SELECT TO anon
  USING (published = true);
CREATE POLICY "Members can view published FAQs"
  ON public.faqs FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view published sound board items" ON public.sound_board_items;
CREATE POLICY "Anyone can view published sound board items"
  ON public.sound_board_items FOR SELECT TO anon
  USING (published = true);
CREATE POLICY "Members can view published sound board items"
  ON public.sound_board_items FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

-- 2) Revoke anon EXECUTE on the SECURITY DEFINER role-check function
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;

-- 3) Explicit SELECT policy for the public avatars bucket
CREATE POLICY "Avatar files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 4) Explicit admin-only policies for the private sound-board-covers bucket
CREATE POLICY "Admins can view sound board covers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sound-board-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload sound board covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sound-board-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sound board covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sound-board-covers' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'sound-board-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sound board covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sound-board-covers' AND public.has_role(auth.uid(), 'admin'));

-- 5) community_profiles is only read by authenticated admin tooling; stop realtime broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.community_profiles';
  END IF;
END$$;