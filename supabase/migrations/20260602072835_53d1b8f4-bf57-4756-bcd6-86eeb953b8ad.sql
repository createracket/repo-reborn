
-- Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- Remove broad SELECT policy on spotlight-images storage bucket.
-- The bucket is public so files remain accessible via their direct public URL;
-- this just prevents clients from listing/enumerating all objects.
DROP POLICY IF EXISTS "Spotlight images are publicly viewable" ON storage.objects;
