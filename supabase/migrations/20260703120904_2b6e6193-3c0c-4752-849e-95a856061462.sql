
DROP POLICY IF EXISTS "Anyone can view published rosters" ON public.rosters;

CREATE OR REPLACE VIEW public.public_rosters AS
SELECT id, owner_id, title, slug, description, published, published_at,
       header_image_url, hide_prospect_tags, created_at, updated_at
FROM public.rosters
WHERE published = true AND slug IS NOT NULL;

GRANT SELECT ON public.public_rosters TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view published campaign reports" ON public.campaign_reports;

CREATE OR REPLACE VIEW public.public_campaign_reports AS
SELECT id, owner_id, title, description, slug, published, published_at,
       header_image_url, created_at, updated_at
FROM public.campaign_reports
WHERE published = true;

GRANT SELECT ON public.public_campaign_reports TO anon, authenticated;

DROP POLICY IF EXISTS "Recipients can view privately shared lead briefs" ON public.lead_briefs;

CREATE OR REPLACE VIEW public.lead_briefs_shared AS
SELECT lb.id, lb.title, lb.description, lb.budget, lb.currency, lb.transparency,
       lb.status, lb.contact_name, lb.company, lb.timeline, lb.target_audience,
       lb.created_at
FROM public.lead_briefs lb
WHERE EXISTS (
  SELECT 1 FROM public.campaign_brief_shares s
  WHERE s.brief_source = 'lead'
    AND s.brief_id = lb.id
    AND (
      s.target_user_id = auth.uid()
      OR (s.target_email IS NOT NULL
          AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    )
);

GRANT SELECT ON public.lead_briefs_shared TO authenticated;
