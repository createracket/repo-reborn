-- Public avatars bucket (anyone can view, users manage their own folder)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Private per-user files bucket (press kits, audio, docs)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner-scoped writes
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- User files: fully private, owner-only
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add a "mock" flag to profiles so seeded community profiles are distinguishable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagline text;