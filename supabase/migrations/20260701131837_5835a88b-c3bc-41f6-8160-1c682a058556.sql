
-- ============ campaign_reports ============
CREATE TABLE public.campaign_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled campaign report',
  description text,
  slug text NOT NULL UNIQUE,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  header_image_url text,
  client_email text,
  brand_email text,
  source_roster_id uuid REFERENCES public.rosters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_reports TO authenticated;
GRANT SELECT ON public.campaign_reports TO anon;
GRANT ALL ON public.campaign_reports TO service_role;

ALTER TABLE public.campaign_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their campaign reports"
  ON public.campaign_reports FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Assigned emails can view campaign reports"
  ON public.campaign_reports FOR SELECT
  TO authenticated
  USING (
    client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR brand_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Anon can only read published reports; sensitive columns are excluded via column-level grants
CREATE POLICY "Anyone can view published campaign reports"
  ON public.campaign_reports FOR SELECT
  TO anon
  USING (published = true);

-- Restrict anon column access (hide emails and owner_id)
REVOKE SELECT ON public.campaign_reports FROM anon;
GRANT SELECT (id, title, description, slug, published, published_at, header_image_url, source_roster_id, created_at, updated_at)
  ON public.campaign_reports TO anon;

CREATE TRIGGER campaign_reports_touch_updated_at
  BEFORE UPDATE ON public.campaign_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ campaign_report_creators ============
CREATE TABLE public.campaign_report_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Creator',
  handle text,
  avatar_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_report_creators TO authenticated;
GRANT SELECT ON public.campaign_report_creators TO anon;
GRANT ALL ON public.campaign_report_creators TO service_role;

ALTER TABLE public.campaign_report_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage creators on their reports"
  ON public.campaign_report_creators FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_reports r WHERE r.id = report_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_reports r WHERE r.id = report_id AND r.owner_id = auth.uid()));

CREATE POLICY "Assigned emails view creators on their reports"
  ON public.campaign_report_creators FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_reports r
    WHERE r.id = report_id
      AND (r.client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR r.brand_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ));

CREATE POLICY "Anyone views creators on published reports"
  ON public.campaign_report_creators FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.campaign_reports r WHERE r.id = report_id AND r.published = true));

CREATE INDEX ON public.campaign_report_creators (report_id, position);

CREATE TRIGGER campaign_report_creators_touch_updated_at
  BEFORE UPDATE ON public.campaign_report_creators
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ campaign_report_posts ============
CREATE TABLE public.campaign_report_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.campaign_report_creators(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram', -- instagram | tiktok | youtube
  post_url text,
  thumbnail_url text,
  caption text,
  posted_at timestamptz,

  -- auto-scrapable metrics
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,

  -- manual metrics
  reach_pct numeric,
  engagement_rate_pct numeric,
  interaction_pct numeric,
  watch_time_hours numeric,

  -- sentiment 0-100
  sentiment_score integer,

  -- featured comments: [{handle, avatar_url, text, meta}]
  featured_comments jsonb NOT NULL DEFAULT '[]'::jsonb,

  hashtags text[] NOT NULL DEFAULT ARRAY[]::text[],
  brand_tag text,

  metrics_updated_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_report_posts TO authenticated;
GRANT SELECT ON public.campaign_report_posts TO anon;
GRANT ALL ON public.campaign_report_posts TO service_role;

ALTER TABLE public.campaign_report_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage posts on their reports"
  ON public.campaign_report_posts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_report_creators c
    JOIN public.campaign_reports r ON r.id = c.report_id
    WHERE c.id = creator_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_report_creators c
    JOIN public.campaign_reports r ON r.id = c.report_id
    WHERE c.id = creator_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Assigned emails view posts on their reports"
  ON public.campaign_report_posts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_report_creators c
    JOIN public.campaign_reports r ON r.id = c.report_id
    WHERE c.id = creator_id
      AND (r.client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR r.brand_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ));

CREATE POLICY "Anyone views posts on published reports"
  ON public.campaign_report_posts FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.campaign_report_creators c
    JOIN public.campaign_reports r ON r.id = c.report_id
    WHERE c.id = creator_id AND r.published = true
  ));

CREATE INDEX ON public.campaign_report_posts (creator_id, position);

CREATE TRIGGER campaign_report_posts_touch_updated_at
  BEFORE UPDATE ON public.campaign_report_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
