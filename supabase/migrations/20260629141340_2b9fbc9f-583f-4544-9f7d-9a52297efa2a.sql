
-- 1) community_profiles: restrict SELECT to published rows
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Authenticated users can view community profiles" ON public.community_profiles;

CREATE POLICY "Authenticated users can view published community profiles"
  ON public.community_profiles
  FOR SELECT
  TO authenticated
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

-- 2) mailing_list_subscribers: explicit admin-only UPDATE policy
CREATE POLICY "Admins can update mailing list subscribers"
  ON public.mailing_list_subscribers
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
