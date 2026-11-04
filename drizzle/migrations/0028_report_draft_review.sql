CREATE TABLE public.report_draft_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  calendar_event_key text,
  platform text,
  media_url text,
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by_name text,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_draft_posts TO authenticated;
GRANT ALL ON public.report_draft_posts TO service_role;
ALTER TABLE public.report_draft_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage draft posts" ON public.report_draft_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER report_draft_posts_touch BEFORE UPDATE ON public.report_draft_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.report_draft_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.report_draft_posts(id) ON DELETE CASCADE,
  author_name text,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_draft_comments TO authenticated;
GRANT ALL ON public.report_draft_comments TO service_role;
ALTER TABLE public.report_draft_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage draft comments" ON public.report_draft_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_report_review_drafts(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(json_agg(json_build_object(
    'id', d.id, 'calendar_event_key', d.calendar_event_key, 'platform', d.platform,
    'media_url', d.media_url, 'media_type', d.media_type, 'caption', d.caption,
    'approval_status', d.approval_status, 'approved_at', d.approved_at, 'approved_by_name', d.approved_by_name,
    'comments', coalesce((SELECT json_agg(json_build_object('id', c.id, 'author_name', c.author_name, 'body', c.body, 'created_at', c.created_at) ORDER BY c.created_at)
       FROM public.report_draft_comments c WHERE c.draft_id = d.id), '[]'::json)
  ) ORDER BY d.position, d.created_at), '[]'::json)
  FROM public.report_draft_posts d JOIN public.campaign_reports r ON r.id = d.report_id
  WHERE r.slug = _slug AND r.slug = 'chats-socials' AND r.published = true AND r.access_code IS NULL AND d.published = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_report_review_drafts(text) TO anon, authenticated;