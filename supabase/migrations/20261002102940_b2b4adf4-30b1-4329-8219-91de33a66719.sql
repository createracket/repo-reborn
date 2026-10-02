ALTER TABLE public.partner_pages ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS partner_pages_linked_user_idx ON public.partner_pages(linked_user_id);
GRANT SELECT (linked_user_id) ON public.partner_pages TO anon, authenticated;
GRANT UPDATE (linked_user_id) ON public.partner_pages TO authenticated;