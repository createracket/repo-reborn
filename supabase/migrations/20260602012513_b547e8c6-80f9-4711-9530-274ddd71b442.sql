
ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS header_image_url text,
  ADD COLUMN IF NOT EXISTS profile_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('spotlight-images', 'spotlight-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Spotlight images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'spotlight-images');

CREATE POLICY "Admins can upload spotlight images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spotlight-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update spotlight images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'spotlight-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete spotlight images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'spotlight-images' AND public.has_role(auth.uid(), 'admin'));
