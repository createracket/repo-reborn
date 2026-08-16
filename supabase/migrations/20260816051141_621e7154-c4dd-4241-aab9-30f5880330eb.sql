CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role / backend jobs and admins may change protected columns.
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.subscription_tier := OLD.subscription_tier;
  NEW.usage_blocked := OLD.usage_blocked;
  NEW.is_featured := OLD.is_featured;
  NEW.flagged_streaming_mismatch := OLD.flagged_streaming_mismatch;
  NEW.flagged_streaming_reason := OLD.flagged_streaming_reason;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;