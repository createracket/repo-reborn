DROP POLICY IF EXISTS "Admins can upload any avatar object" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any avatar object" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any avatar object" ON storage.objects;

CREATE POLICY "Admins can upload any avatar object"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any avatar object"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any avatar object"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));