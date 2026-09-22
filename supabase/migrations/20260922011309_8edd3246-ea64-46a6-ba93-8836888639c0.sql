ALTER FUNCTION public.get_public_roster(text) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_public_roster(text) TO anon, authenticated;