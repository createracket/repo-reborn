
CREATE TABLE public.campaign_brief_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_source text NOT NULL CHECK (brief_source IN ('user','lead')),
  brief_id uuid NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_brief_shares_target_present CHECK (
    target_user_id IS NOT NULL OR (target_email IS NOT NULL AND length(target_email) > 2)
  )
);

CREATE INDEX campaign_brief_shares_brief_idx
  ON public.campaign_brief_shares (brief_source, brief_id);
CREATE INDEX campaign_brief_shares_target_user_idx
  ON public.campaign_brief_shares (target_user_id);
CREATE INDEX campaign_brief_shares_target_email_idx
  ON public.campaign_brief_shares (lower(target_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_brief_shares TO authenticated;
GRANT ALL ON public.campaign_brief_shares TO service_role;

ALTER TABLE public.campaign_brief_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all brief shares"
  ON public.campaign_brief_shares
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view shares that target them"
  ON public.campaign_brief_shares
  FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR (
      target_email IS NOT NULL
      AND lower(target_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

-- Let the recipient read the brief itself
CREATE POLICY "Recipients can view privately shared campaign briefs"
  ON public.campaign_briefs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_brief_shares s
      WHERE s.brief_source = 'user'
        AND s.brief_id = campaign_briefs.id
        AND (
          s.target_user_id = auth.uid()
          OR (s.target_email IS NOT NULL
              AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        )
    )
  );

CREATE POLICY "Recipients can view privately shared lead briefs"
  ON public.lead_briefs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_brief_shares s
      WHERE s.brief_source = 'lead'
        AND s.brief_id = lead_briefs.id
        AND (
          s.target_user_id = auth.uid()
          OR (s.target_email IS NOT NULL
              AND lower(s.target_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        )
    )
  );
