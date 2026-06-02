GRANT SELECT ON public.partner_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_pages TO authenticated;
GRANT ALL ON public.partner_pages TO service_role;