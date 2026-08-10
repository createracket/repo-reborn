ALTER TABLE public.partner_pages ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'spotlight';
CREATE INDEX IF NOT EXISTS partner_pages_section_idx ON public.partner_pages (section);