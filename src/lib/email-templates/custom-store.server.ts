/**
 * Server-only fetch helper for admin-authored custom templates.
 * Uses the service-role client because the resolver runs from server routes
 * (send pipeline) where there is no end-user JWT to scope by.
 */
export interface CustomTemplateRow {
  id: string
  name: string
  display_name: string
  subject: string
  body_markdown: string
  variables: string[]
  sample_data: Record<string, any>
}

export async function fetchCustomTemplateByName(
  name: string,
): Promise<CustomTemplateRow | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin
    .from('email_custom_templates')
    .select('id, name, display_name, subject, body_markdown, variables, sample_data')
    .eq('name', name)
    .maybeSingle()
  if (error) {
    console.error('fetchCustomTemplateByName failed', { error, name })
    return null
  }
  return (data as CustomTemplateRow | null) ?? null
}
