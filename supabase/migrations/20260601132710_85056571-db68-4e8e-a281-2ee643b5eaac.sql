-- Undo earlier profiles additions
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_mock;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS location;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tagline;

-- Community / showcase profiles (no auth.users FK)
CREATE TABLE public.community_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('artist','brand','fan')),
  tagline text,
  bio text,
  location text,
  avatar_url text,
  values text[] NOT NULL DEFAULT '{}',
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_profiles TO authenticated;
GRANT ALL ON public.community_profiles TO service_role;

ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view community profiles"
ON public.community_profiles FOR SELECT TO authenticated
USING (true);