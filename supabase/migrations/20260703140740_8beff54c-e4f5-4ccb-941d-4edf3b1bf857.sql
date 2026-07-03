DROP POLICY IF EXISTS "Public can read spotlight images" ON storage.objects;
CREATE POLICY "Public can read spotlight images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'spotlight-images');

DROP POLICY IF EXISTS "Authenticated users can upload spotlight images" ON storage.objects;
CREATE POLICY "Authenticated users can upload spotlight images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spotlight-images');

DROP POLICY IF EXISTS "Authenticated users can update spotlight images" ON storage.objects;
CREATE POLICY "Authenticated users can update spotlight images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'spotlight-images')
WITH CHECK (bucket_id = 'spotlight-images');

DROP POLICY IF EXISTS "Authenticated users can delete spotlight images" ON storage.objects;
CREATE POLICY "Authenticated users can delete spotlight images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'spotlight-images');