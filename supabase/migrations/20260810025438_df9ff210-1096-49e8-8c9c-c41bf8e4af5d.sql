ALTER TABLE public.spotlight_interests
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS handled boolean NOT NULL DEFAULT false;

ALTER TABLE public.spotlight_interests
  DROP CONSTRAINT IF EXISTS spotlight_interests_actor_present;
ALTER TABLE public.spotlight_interests
  ADD CONSTRAINT spotlight_interests_actor_present
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS spotlight_interests_guest_unique
  ON public.spotlight_interests (partner_page_id, lower(guest_email))
  WHERE guest_email IS NOT NULL;

DROP POLICY IF EXISTS "Admins can update spotlight interests" ON public.spotlight_interests;
CREATE POLICY "Admins can update spotlight interests"
  ON public.spotlight_interests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete spotlight interests" ON public.spotlight_interests;
CREATE POLICY "Admins can delete spotlight interests"
  ON public.spotlight_interests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotlight_interests TO authenticated;
GRANT ALL ON public.spotlight_interests TO service_role;