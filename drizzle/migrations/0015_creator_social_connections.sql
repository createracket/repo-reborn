CREATE TABLE public.creator_connect_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.campaign_report_creators(id) ON DELETE CASCADE,
  created_by uuid,
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.creator_connect_links TO authenticated;
GRANT ALL ON public.creator_connect_links TO service_role;
ALTER TABLE public.creator_connect_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage creator connect links" ON public.creator_connect_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.creator_social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.campaign_report_creators(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram','tiktok')),
  account_id text,
  username text,
  access_token_enc text NOT NULL,
  refresh_token_enc text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_error text,
  UNIQUE (creator_id, platform)
);
GRANT SELECT (id, creator_id, platform, username, connected_at, last_sync_at, last_error, expires_at) ON public.creator_social_connections TO authenticated;
GRANT DELETE ON public.creator_social_connections TO authenticated;
GRANT ALL ON public.creator_social_connections TO service_role;
ALTER TABLE public.creator_social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view creator connections" ON public.creator_social_connections
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove creator connections" ON public.creator_social_connections
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));