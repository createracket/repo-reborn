CREATE OR REPLACE FUNCTION public.campaign_reports_touch_updated_at_fn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['auto_pull_lease_until','auto_pull_last_run','auto_pull_last_result','updated_at'])
     = (to_jsonb(OLD) - ARRAY['auto_pull_lease_until','auto_pull_last_run','auto_pull_last_result','updated_at']) THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.campaign_reports_touch_updated_at_fn() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS campaign_reports_touch_updated_at ON public.campaign_reports;
CREATE TRIGGER campaign_reports_touch_updated_at
  BEFORE UPDATE ON public.campaign_reports
  FOR EACH ROW EXECUTE FUNCTION public.campaign_reports_touch_updated_at_fn();