CREATE TABLE public.email_event_bindings (
  event_key TEXT PRIMARY KEY,
  template_name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_event_bindings TO authenticated;
GRANT ALL ON public.email_event_bindings TO service_role;

ALTER TABLE public.email_event_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email event bindings"
ON public.email_event_bindings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER email_event_bindings_touch_updated_at
BEFORE UPDATE ON public.email_event_bindings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Preserve the two flows that already send today; everything else stays off.
INSERT INTO public.email_event_bindings (event_key, template_name, enabled) VALUES
  ('contact_submitted', 'contact-confirmation', true),
  ('waitlist_joined', 'waitlist-confirmation', true);