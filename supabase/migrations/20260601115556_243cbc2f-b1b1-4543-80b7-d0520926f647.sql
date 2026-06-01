-- Enum for account types
CREATE TYPE public.account_type AS ENUM ('artist', 'brand', 'fan');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  account_type public.account_type,
  bio TEXT,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  values TEXT[] NOT NULL DEFAULT '{}',
  marketing_opt_in BOOLEAN NOT NULL DEFAULT true,
  notify_new_matches BOOLEAN NOT NULL DEFAULT true,
  notify_direct_messages BOOLEAN NOT NULL DEFAULT true,
  notify_newsletter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vibe check responses
CREATE TABLE public.vibe_check_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  artist_score NUMERIC NOT NULL DEFAULT 0,
  brand_score NUMERIC NOT NULL DEFAULT 0,
  result public.account_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vibe_check_responses TO authenticated;
GRANT ALL ON public.vibe_check_responses TO service_role;

ALTER TABLE public.vibe_check_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vibe checks"
  ON public.vibe_check_responses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vibe checks"
  ON public.vibe_check_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mailing list (waitlist + fan signups, no login needed)
CREATE TABLE public.mailing_list_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'waitlist',
  marketing_opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.mailing_list_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.mailing_list_subscribers TO service_role;

ALTER TABLE public.mailing_list_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.mailing_list_subscribers FOR INSERT
  WITH CHECK (true);

-- Campaign briefs
CREATE TABLE public.campaign_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  budget NUMERIC,
  timeline TEXT,
  core_values TEXT[] NOT NULL DEFAULT '{}',
  collaboration_types TEXT[] NOT NULL DEFAULT '{}',
  target_audience TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'in_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_briefs TO authenticated;
GRANT ALL ON public.campaign_briefs TO service_role;

ALTER TABLE public.campaign_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own briefs"
  ON public.campaign_briefs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own briefs"
  ON public.campaign_briefs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own briefs"
  ON public.campaign_briefs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own briefs"
  ON public.campaign_briefs FOR DELETE USING (auth.uid() = user_id);

-- Roster members (Co-Create)
CREATE TABLE public.roster_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_id)
);

GRANT SELECT, INSERT, DELETE ON public.roster_members TO authenticated;
GRANT ALL ON public.roster_members TO service_role;

ALTER TABLE public.roster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roster"
  ON public.roster_members FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can add to their own roster"
  ON public.roster_members FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can remove from their own roster"
  ON public.roster_members FOR DELETE USING (auth.uid() = owner_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();