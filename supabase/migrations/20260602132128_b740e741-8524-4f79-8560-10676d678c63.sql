ALTER PUBLICATION supabase_realtime ADD TABLE public.community_profiles;
ALTER TABLE public.community_profiles REPLICA IDENTITY FULL;