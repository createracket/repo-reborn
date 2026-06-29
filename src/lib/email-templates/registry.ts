import type { ComponentType } from 'react'
import { template as waitlistConfirmation } from './waitlist-confirmation'
import { template as contactConfirmation } from './contact-confirmation'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Add new templates here after creating them in this directory.
 * Custom admin-authored templates live in `email_custom_templates` and are
 * resolved at send time via `resolveRenderedEmail`.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'waitlist-confirmation': waitlistConfirmation,
  'contact-confirmation': contactConfirmation,
}

export interface ResolvedEmail {
  subject: string
  html: string
  text: string
  /** Optional fixed recipient (built-in templates only). */
  to?: string
  /** "builtin" | "custom" — for logging / error context. */
  source: 'builtin' | 'custom'
}

/**
 * Look up a template by name and render it with the supplied data.
 * Checks built-in registry first, then falls back to admin-authored
 * templates stored in `email_custom_templates`.
 * Returns null if nothing matches.
 */
export async function resolveRenderedEmail(
  name: string,
  data: Record<string, any>,
): Promise<ResolvedEmail | null> {
  const builtin = TEMPLATES[name]
  if (builtin) {
    const React = await import('react')
    const { render } = await import('@react-email/render')
    const element = React.createElement(builtin.component, data)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof builtin.subject === 'function' ? builtin.subject(data) : builtin.subject
    return { subject, html, text, to: builtin.to, source: 'builtin' }
  }

  // Custom (DB-stored) template fallback
  const { fetchCustomTemplateByName } = await import('./custom-store.server')
  const row = await fetchCustomTemplateByName(name)
  if (!row) return null
  const { renderCustomEmail } = await import('./render-custom.server')
  const rendered = await renderCustomEmail(
    { subject: row.subject, bodyMarkdown: row.body_markdown },
    data,
  )
  return { ...rendered, source: 'custom' }
}
