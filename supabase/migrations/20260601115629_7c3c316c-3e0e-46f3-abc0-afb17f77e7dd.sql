-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE on SECURITY DEFINER helpers from API roles (triggers still work)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Replace mailing list "always true" insert policy with a non-trivial check
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.mailing_list_subscribers;
CREATE POLICY "Anyone can subscribe with an email"
  ON public.mailing_list_subscribers FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(email) > 3);