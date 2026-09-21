ALTER FUNCTION public.get_public_roster(text) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.get_public_roster(text) TO anon;