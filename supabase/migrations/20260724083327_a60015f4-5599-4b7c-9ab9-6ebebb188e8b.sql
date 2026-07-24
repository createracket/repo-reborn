
CREATE TABLE public.sound_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  copy TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  thumbnail_url TEXT,
  gradient TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sound_board_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sound_board_items TO authenticated;
GRANT ALL ON public.sound_board_items TO service_role;

ALTER TABLE public.sound_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published sound board items"
  ON public.sound_board_items FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sound board items"
  ON public.sound_board_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sound board items"
  ON public.sound_board_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sound board items"
  ON public.sound_board_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sound_board_items_updated_at
  BEFORE UPDATE ON public.sound_board_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sound_board_items (title, copy, gradient, position) VALUES
  ('Case study coming soon', 'A campaign breakdown showing how a brand and artist collaborated end-to-end.', 'linear-gradient(135deg,#5C37D0,#FFC0CB)', 0),
  ('Social moment', 'Example of an unskippable collab clip that landed with real fans.', 'linear-gradient(135deg,#BADA55,#5C37D0)', 1),
  ('Brand x artist story', 'Behind-the-scenes look at a partnership from brief to release.', 'linear-gradient(135deg,#FFC0CB,#BADA55)', 2),
  ('Fan-first activation', 'How a community-led moment turned into a full campaign.', 'linear-gradient(135deg,#5C37D0,#BADA55)', 3),
  ('UGC that landed', 'Creator content that outperformed the paid cut — and why.', 'linear-gradient(135deg,#FFC0CB,#5C37D0)', 4),
  ('Playlist push', 'Turning a sync placement into an ongoing streaming story.', 'linear-gradient(135deg,#BADA55,#FFC0CB)', 5),
  ('Tour tie-in', 'Aligning brand activations with a live moment for maximum reach.', 'linear-gradient(135deg,#5C37D0,#FFC0CB)', 6),
  ('Feature drop', 'How one collab clip became a repeatable content format.', 'linear-gradient(135deg,#BADA55,#5C37D0)', 7);
