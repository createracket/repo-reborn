CREATE TABLE public.spotlight_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_page_id UUID NOT NULL REFERENCES public.partner_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (partner_page_id, user_id)
);

CREATE INDEX idx_spotlight_interests_partner ON public.spotlight_interests(partner_page_id);
CREATE INDEX idx_spotlight_interests_user ON public.spotlight_interests(user_id);

GRANT SELECT, INSERT, DELETE ON public.spotlight_interests TO authenticated;
GRANT ALL ON public.spotlight_interests TO service_role;

ALTER TABLE public.spotlight_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can register their own interest"
  ON public.spotlight_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interests"
  ON public.spotlight_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own interest"
  ON public.spotlight_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all spotlight interests"
  ON public.spotlight_interests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
