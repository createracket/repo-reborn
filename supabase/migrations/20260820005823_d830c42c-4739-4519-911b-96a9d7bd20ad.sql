ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS brief_link text,
  ADD COLUMN IF NOT EXISTS brief_file_path text,
  ADD COLUMN IF NOT EXISTS brief_file_name text,
  ADD COLUMN IF NOT EXISTS brief_file_size integer;

ALTER TABLE public.lead_briefs
  ADD COLUMN IF NOT EXISTS brief_link text,
  ADD COLUMN IF NOT EXISTS brief_file_path text,
  ADD COLUMN IF NOT EXISTS brief_file_name text,
  ADD COLUMN IF NOT EXISTS brief_file_size integer;

GRANT SELECT (brief_link, brief_file_path, brief_file_name, brief_file_size),
      INSERT (brief_link, brief_file_path, brief_file_name, brief_file_size),
      UPDATE (brief_link, brief_file_path, brief_file_name, brief_file_size)
  ON public.campaign_briefs TO authenticated;

GRANT ALL ON public.campaign_briefs TO service_role;
GRANT ALL ON public.lead_briefs TO service_role;