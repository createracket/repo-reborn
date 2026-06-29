CREATE TABLE public.email_custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL DEFAULT '',
  variables TEXT[] NOT NULL DEFAULT '{}',
  sample_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_custom_templates_name_format CHECK (name ~ '^[a-z0-9][a-z0-9-]{1,118}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_custom_templates TO authenticated;
GRANT ALL ON public.email_custom_templates TO service_role;

ALTER TABLE public.email_custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view custom templates"
  ON public.email_custom_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert custom templates"
  ON public.email_custom_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update custom templates"
  ON public.email_custom_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete custom templates"
  ON public.email_custom_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER email_custom_templates_set_updated_at
  BEFORE UPDATE ON public.email_custom_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();