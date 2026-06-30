CREATE POLICY "Restrict profile reads to owner or admin"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));