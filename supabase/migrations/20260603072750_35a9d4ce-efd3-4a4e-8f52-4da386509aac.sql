ALTER TABLE public.community_profiles DROP CONSTRAINT IF EXISTS community_profiles_account_type_check;
ALTER TABLE public.community_profiles ADD CONSTRAINT community_profiles_account_type_check CHECK (account_type = ANY (ARRAY['artist','band','brand','creative','fan','crew']));
UPDATE public.community_profiles SET account_type = lower(account_type) WHERE account_type <> lower(account_type);