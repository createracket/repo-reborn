
-- Normalise existing values to the new vocabulary
UPDATE public.campaign_briefs
SET status = CASE
  WHEN status IN ('submitted','in_review','in_progress','review_your_roster','review_your_report') THEN status
  WHEN status ILIKE 'new' THEN 'submitted'
  WHEN status ILIKE 'reviewing' OR status ILIKE 'in review' THEN 'in_review'
  WHEN status ILIKE 'in progress' OR status ILIKE 'active' THEN 'in_progress'
  ELSE 'submitted'
END;

UPDATE public.lead_briefs
SET status = CASE
  WHEN status IN ('submitted','in_review','in_progress','review_your_roster','review_your_report') THEN status
  WHEN status ILIKE 'new' THEN 'submitted'
  WHEN status ILIKE 'reviewing' OR status ILIKE 'in review' THEN 'in_review'
  WHEN status ILIKE 'in progress' OR status ILIKE 'active' THEN 'in_progress'
  ELSE 'submitted'
END;

ALTER TABLE public.campaign_briefs ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE public.lead_briefs ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE public.campaign_briefs DROP CONSTRAINT IF EXISTS campaign_briefs_status_check;
ALTER TABLE public.campaign_briefs
  ADD CONSTRAINT campaign_briefs_status_check
  CHECK (status IN ('submitted','in_review','in_progress','review_your_roster','review_your_report'));

ALTER TABLE public.lead_briefs DROP CONSTRAINT IF EXISTS lead_briefs_status_check;
ALTER TABLE public.lead_briefs
  ADD CONSTRAINT lead_briefs_status_check
  CHECK (status IN ('submitted','in_review','in_progress','review_your_roster','review_your_report'));
