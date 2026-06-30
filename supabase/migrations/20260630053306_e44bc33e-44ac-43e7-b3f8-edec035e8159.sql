
-- Create all tables first so cross-references in policies resolve
CREATE TABLE public.rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roster_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('profile','prospect')),
  profile_id uuid REFERENCES public.community_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  instagram_url text,
  instagram_followers integer,
  tiktok_url text,
  tiktok_followers integer,
  youtube_url text,
  youtube_subscribers integer,
  spotify_url text,
  spotify_monthly_listens integer,
  example_video_url text,
  bio_page_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roster_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roster_id, user_id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rosters TO authenticated;
GRANT ALL ON public.rosters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_items TO authenticated;
GRANT ALL ON public.roster_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_shares TO authenticated;
GRANT ALL ON public.roster_shares TO service_role;

-- RLS
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all rosters" ON public.rosters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Shared users can view rosters" ON public.rosters
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.roster_shares s
    WHERE s.roster_id = rosters.id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all roster items" ON public.roster_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Shared users view roster items" ON public.roster_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.roster_shares s
    WHERE s.roster_id = roster_items.roster_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all roster shares" ON public.roster_shares
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own shares" ON public.roster_shares
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX roster_items_roster_id_idx ON public.roster_items(roster_id);
CREATE INDEX roster_shares_user_id_idx ON public.roster_shares(user_id);
CREATE INDEX roster_shares_roster_id_idx ON public.roster_shares(roster_id);

-- Triggers
CREATE TRIGGER rosters_touch_updated_at
  BEFORE UPDATE ON public.rosters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER roster_items_touch_updated_at
  BEFORE UPDATE ON public.roster_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
