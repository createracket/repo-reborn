ALTER TABLE public.report_draft_posts ADD COLUMN platforms text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.get_report_review_drafts(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(json_agg(json_build_object(
    'id', d.id, 'calendar_event_key', d.calendar_event_key, 'platform', d.platform, 'platforms', d.platforms,
    'media_url', d.media_url, 'media_path', d.media_path, 'media_type', d.media_type,
    'link_url', d.link_url, 'caption', d.caption,
    'approval_status', d.approval_status, 'approved_at', d.approved_at, 'approved_by_name', d.approved_by_name,
    'comments', coalesce((SELECT json_agg(json_build_object('id', c.id, 'author_name', c.author_name, 'body', c.body, 'created_at', c.created_at) ORDER BY c.created_at)
       FROM public.report_draft_comments c WHERE c.draft_id = d.id), '[]'::json)
  ) ORDER BY d.position, d.created_at), '[]'::json)
  FROM public.report_draft_posts d JOIN public.campaign_reports r ON r.id = d.report_id
  WHERE r.slug = _slug AND r.slug = 'chats-socials' AND r.published = true AND r.access_code IS NULL AND d.published = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_report_review_drafts(text) TO anon, authenticated;