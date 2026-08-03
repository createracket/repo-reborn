ALTER TABLE public.campaign_reports
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS access_code_label text;

CREATE TABLE IF NOT EXISTS public.campaign_report_access_leads (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.campaign_reports(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.campaign_report_access_leads TO service_role;
GRANT SELECT ON public.campaign_report_access_leads TO authenticated;
ALTER TABLE public.campaign_report_access_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins view report leads" ON public.campaign_report_access_leads;
CREATE POLICY "Owners and admins view report leads"
ON public.campaign_report_access_leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.campaign_reports r WHERE r.id = report_id AND r.owner_id = auth.uid())
);

CREATE OR REPLACE VIEW public.public_campaign_reports AS
SELECT id, owner_id, title, description, slug, published, published_at, header_image_url, created_at, updated_at, categories, hide_categories, template
FROM public.campaign_reports
WHERE published = true AND access_code IS NULL;

GRANT SELECT ON public.public_campaign_reports TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone views creators on published reports" ON public.campaign_report_creators;
CREATE POLICY "Anyone views creators on published reports"
ON public.campaign_report_creators FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.campaign_reports r
  WHERE r.id = campaign_report_creators.report_id AND r.published = true AND r.access_code IS NULL
));

DROP POLICY IF EXISTS "Anyone views posts on published reports" ON public.campaign_report_posts;
CREATE POLICY "Anyone views posts on published reports"
ON public.campaign_report_posts FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.campaign_report_creators c
  JOIN public.campaign_reports r ON r.id = c.report_id
  WHERE c.id = campaign_report_posts.creator_id AND r.published = true AND r.access_code IS NULL
));