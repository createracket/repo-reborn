DROP POLICY IF EXISTS "Authenticated users can view published briefs" ON public.campaign_briefs;

CREATE POLICY "Authenticated users can view published briefs"
ON public.campaign_briefs
FOR SELECT
TO authenticated
USING (published = true);

REVOKE SELECT ON public.campaign_briefs FROM authenticated;
GRANT SELECT (id, user_id, title, description, budget, core_values, target_audience,
              collaboration_types, timeline, status, published, published_at, created_at)
ON public.campaign_briefs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaign_briefs TO authenticated;