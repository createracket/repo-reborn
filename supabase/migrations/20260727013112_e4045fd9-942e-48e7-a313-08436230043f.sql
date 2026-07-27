CREATE TABLE public.racket_desk_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  handle text NOT NULL,
  regions text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.racket_desk_profiles TO authenticated;
GRANT ALL ON public.racket_desk_profiles TO service_role;

ALTER TABLE public.racket_desk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own racket desk profiles"
ON public.racket_desk_profiles FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_racket_desk_profiles_updated_at
BEFORE UPDATE ON public.racket_desk_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_racket_desk_profiles_user ON public.racket_desk_profiles(user_id);