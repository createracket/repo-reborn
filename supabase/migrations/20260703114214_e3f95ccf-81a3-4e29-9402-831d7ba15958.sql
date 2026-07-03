
CREATE TABLE public.example_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  image_url TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.example_opportunities TO anon, authenticated;
GRANT ALL ON public.example_opportunities TO service_role;

ALTER TABLE public.example_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view example opportunities"
  ON public.example_opportunities FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert example opportunities"
  ON public.example_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update example opportunities"
  ON public.example_opportunities FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete example opportunities"
  ON public.example_opportunities FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER example_opportunities_updated_at
  BEFORE UPDATE ON public.example_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.example_opportunities (title, description, location, position) VALUES
  ('Global sportswear brand — TikTok creators', 'Looking for 6 UGC creators for a 4-week TikTok campaign around a new footwear drop. Paid brief with product seeding.', 'UK / Global', 0),
  ('Emerging festival — artist co-promotion', 'Sydney festival seeking 3 local artists on the lineup for co-branded reels and story takeovers ahead of on-sale.', 'Sydney, AU', 1),
  ('DTC beauty — music fan community push', 'Music-forward beauty brand wants EGC/UGC around their summer edit, targeting Gen Z music fans across IG and TikTok.', 'US / Remote', 2);
