CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  client_name text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER campaigns_touch BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaign_briefs ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.partner_pages ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.rosters ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_reports ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

GRANT SELECT (campaign_id), INSERT (campaign_id), UPDATE (campaign_id) ON public.campaign_briefs TO authenticated;
GRANT SELECT (campaign_id), INSERT (campaign_id), UPDATE (campaign_id) ON public.partner_pages TO authenticated;
GRANT SELECT (campaign_id), INSERT (campaign_id), UPDATE (campaign_id) ON public.rosters TO authenticated;
GRANT SELECT (campaign_id), INSERT (campaign_id), UPDATE (campaign_id) ON public.campaign_reports TO authenticated;
GRANT SELECT (campaign_id) ON public.campaign_briefs, public.partner_pages, public.rosters, public.campaign_reports TO anon;

CREATE TEMP TABLE _cb_map ON COMMIT DROP AS
  SELECT b.id AS brief_id, gen_random_uuid() AS campaign_id, b.user_id, b.title, b.display_order, b.created_at
  FROM public.campaign_briefs b;
INSERT INTO public.campaigns (id, owner_id, title, display_order, created_at)
  SELECT campaign_id, user_id, title, display_order, created_at FROM _cb_map;
UPDATE public.campaign_briefs b SET campaign_id = m.campaign_id FROM _cb_map m WHERE b.id = m.brief_id;
UPDATE public.rosters r SET campaign_id = b.campaign_id FROM public.campaign_briefs b
  WHERE r.campaign_id IS NULL AND (b.linked_roster_id = r.id OR r.brief_id = b.id);
UPDATE public.campaign_reports r SET campaign_id = b.campaign_id FROM public.campaign_briefs b
  WHERE r.campaign_id IS NULL AND b.linked_report_id = r.id;