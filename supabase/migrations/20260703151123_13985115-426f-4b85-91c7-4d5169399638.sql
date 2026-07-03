
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flagged_streaming_mismatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_streaming_reason text;

ALTER TABLE public.roster_items
  ADD COLUMN IF NOT EXISTS flagged_streaming_mismatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_streaming_reason text;

ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS flagged_streaming_mismatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_streaming_reason text;

-- Security: stop leaking brand_email / client_email to anon on campaign_reports.
-- The public share page reads from public.public_campaign_reports (which omits
-- these columns), so the base-table anon policy and grant are unnecessary.
DROP POLICY IF EXISTS "Anyone views published campaign reports" ON public.campaign_reports;

CREATE POLICY "Authenticated users view published campaign reports"
  ON public.campaign_reports
  FOR SELECT
  TO authenticated
  USING (published = true);

REVOKE SELECT ON public.campaign_reports FROM anon;
