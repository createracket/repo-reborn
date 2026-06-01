
-- Restrict profiles SELECT: only owner sees full row (including email)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Public-safe view for cross-user reads (no email, no notification prefs)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, display_name, avatar_url, bio, account_type, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
