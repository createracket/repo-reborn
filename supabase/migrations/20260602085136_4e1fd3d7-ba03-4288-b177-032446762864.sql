ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'creative';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'crew';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_type text;
  resolved_type public.account_type;
BEGIN
  meta_type := lower(coalesce(NEW.raw_user_meta_data->>'account_type', ''));
  IF meta_type IN ('artist','brand','fan','creative','crew') THEN
    resolved_type := meta_type::public.account_type;
  ELSE
    resolved_type := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, avatar_url, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    resolved_type
  )
  ON CONFLICT (id) DO UPDATE
    SET account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type);
  RETURN NEW;
END;
$function$;