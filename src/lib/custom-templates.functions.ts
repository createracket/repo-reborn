import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error || !data) throw new Error('Forbidden')
}

const NameSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]{1,118}$/, 'Use lowercase letters, numbers, and dashes only')

const TemplateUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: NameSchema,
  display_name: z.string().min(1).max(160),
  subject: z.string().min(1).max(255),
  body_markdown: z.string().max(50_000).default(''),
  sample_data: z.record(z.string(), z.any()).default({}),
})

export const listCustomTemplates = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { data, error } = await context.supabase
      .from('email_custom_templates')
      .select('id, name, display_name, subject, body_markdown, variables, sample_data, updated_at')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { rows: data ?? [] }
  })

export const getCustomTemplate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { data: row, error } = await context.supabase
      .from('email_custom_templates')
      .select('id, name, display_name, subject, body_markdown, variables, sample_data')
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) throw new Error('Template not found')
    return row
  })

export const upsertCustomTemplate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TemplateUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { extractVariables } = await import('@/lib/email-templates/merge-tags')
    const variables = extractVariables(data.subject, data.body_markdown)
    // Built-in name collisions are allowed: saving with a built-in name
    // creates an override that the send pipeline prefers over the React
    // component template.

    const payload = {
      name: data.name,
      display_name: data.display_name,
      subject: data.subject,
      body_markdown: data.body_markdown,
      variables,
      sample_data: data.sample_data,
      created_by: context.userId,
    }

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from('email_custom_templates')
        .update(payload)
        .eq('id', data.id)
        .select('id, name, display_name, subject, body_markdown, variables, sample_data, updated_at')
        .single()
      if (error) throw new Error(error.message)
      return row
    } else {
      const { data: row, error } = await context.supabase
        .from('email_custom_templates')
        .insert(payload)
        .select('id, name, display_name, subject, body_markdown, variables, sample_data, updated_at')
        .single()
      if (error) throw new Error(error.message)
      return row
    }
  })

export const deleteCustomTemplate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { error } = await context.supabase
      .from('email_custom_templates')
      .delete()
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/**
 * Open a built-in template for editing. If an override row already exists
 * for this name, return its id. Otherwise seed one from the built-in's
 * markdown defaults and return the new id.
 */
export const getOrCreateBuiltinOverride = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: NameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { BUILTIN_DEFAULTS } = await import('@/lib/email-templates/builtin-defaults')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')

    const builtin = TEMPLATES[data.name]
    if (!builtin) throw new Error(`'${data.name}' is not a built-in template`)
    const seed = BUILTIN_DEFAULTS[data.name]
    if (!seed) {
      throw new Error(
        `No editable defaults available for '${data.name}' — add an entry to builtin-defaults.ts`,
      )
    }

    const { data: existing, error: selErr } = await context.supabase
      .from('email_custom_templates')
      .select('id')
      .eq('name', data.name)
      .maybeSingle()
    if (selErr) throw new Error(selErr.message)
    if (existing) return { id: existing.id as string, created: false }

    const { extractVariables } = await import('@/lib/email-templates/merge-tags')
    const variables = extractVariables(seed.subject, seed.body_markdown)

    const { data: row, error } = await context.supabase
      .from('email_custom_templates')
      .insert({
        name: data.name,
        display_name: seed.display_name,
        subject: seed.subject,
        body_markdown: seed.body_markdown,
        variables,
        sample_data: seed.sample_data,
        created_by: context.userId,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row.id as string, created: true }
  })

