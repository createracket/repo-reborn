DROP POLICY IF EXISTS "Anyone views published campaign reports" ON public.campaign_reports;
CREATE POLICY "Anyone views published campaign reports" ON public.campaign_reports FOR SELECT TO anon, authenticated USING (published = true AND access_code IS NULL);
GRANT SELECT (id, owner_id, title, description, slug, published, published_at, header_image_url, source_roster_id, created_at, updated_at, categories, hide_categories, template, access_code_label, profile_image_url, thumb_frame) ON public.campaign_reports TO anon;

DROP POLICY IF EXISTS "Anyone views creators on published reports" ON public.campaign_report_creators;
CREATE POLICY "Anyone views creators on published reports" ON public.campaign_report_creators FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.campaign_reports r WHERE r.id = campaign_report_creators.report_id AND r.published = true AND r.access_code IS NULL));
GRANT SELECT ON public.campaign_report_creators TO anon;

DROP POLICY IF EXISTS "Anyone views posts on published reports" ON public.campaign_report_posts;
CREATE POLICY "Anyone views posts on published reports" ON public.campaign_report_posts FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.campaign_report_creators c JOIN public.campaign_reports r ON r.id = c.report_id WHERE c.id = campaign_report_posts.creator_id AND r.published = true AND r.access_code IS NULL));
GRANT SELECT ON public.campaign_report_posts TO anon;

DROP POLICY IF EXISTS "Anyone signed in reads limits" ON public.usage_limits;