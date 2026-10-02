ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_spotlight boolean NOT NULL DEFAULT false;
GRANT SELECT (can_spotlight) ON public.profiles TO authenticated;
GRANT UPDATE (can_spotlight) ON public.profiles TO authenticated;
ALTER TABLE public.talent_intake_requests ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS talent_intake_user_idx ON public.talent_intake_requests(user_id);

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
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
  NEW.can_spotlight := OLD.can_spotlight;
  RETURN NEW;
END;
$function$;