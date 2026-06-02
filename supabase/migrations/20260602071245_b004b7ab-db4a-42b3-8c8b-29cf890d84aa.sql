-- Allow admins to manage community profiles (suggested matches)
CREATE POLICY "Admins can insert community profiles"
ON public.community_profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update community profiles"
ON public.community_profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete community profiles"
ON public.community_profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));