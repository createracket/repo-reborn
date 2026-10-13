DROP POLICY IF EXISTS "Anyone can view example opportunities" ON public.example_opportunities;
CREATE POLICY "Signed-in users can view example opportunities" ON public.example_opportunities FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.example_opportunities FROM anon;