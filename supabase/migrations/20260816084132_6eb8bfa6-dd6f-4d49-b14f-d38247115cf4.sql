CREATE POLICY "Admins can view all vibe checks"
ON public.vibe_check_responses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.vibe_check_responses TO authenticated;