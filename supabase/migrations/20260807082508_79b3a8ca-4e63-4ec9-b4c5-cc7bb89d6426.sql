ALTER TABLE public.social_listening_scans
  ADD COLUMN IF NOT EXISTS dashboard_visible boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.social_listening_scan_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.social_listening_scans(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scan_id, target_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_listening_scan_shares TO authenticated;
GRANT ALL ON public.social_listening_scan_shares TO service_role;

ALTER TABLE public.social_listening_scan_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage listening report shares"
  ON public.social_listening_scan_shares FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own listening report shares"
  ON public.social_listening_scan_shares FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

CREATE POLICY "Assigned users can read shared listening reports"
  ON public.social_listening_scans FOR SELECT
  TO authenticated
  USING (
    dashboard_visible
    AND EXISTS (
      SELECT 1 FROM public.social_listening_scan_shares s
      WHERE s.scan_id = social_listening_scans.id
        AND s.target_user_id = auth.uid()
    )
  );