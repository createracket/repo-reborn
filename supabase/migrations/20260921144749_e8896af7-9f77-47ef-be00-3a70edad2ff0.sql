REVOKE EXECUTE ON FUNCTION public.get_public_roster(text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_roster(text) TO anon;