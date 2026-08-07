CREATE OR REPLACE VIEW public.lead_briefs_shared AS
SELECT id, title, description, budget, currency, transparency, status, contact_name, company, timeline, target_audience, created_at, display_order
FROM public.lead_briefs lb
WHERE EXISTS (
  SELECT 1 FROM public.campaign_brief_shares s
  WHERE s.brief_source = 'lead' AND s.brief_id = lb.id
    AND (s.target_user_id = auth.uid() OR (s.target_email IS NOT NULL AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))))
);