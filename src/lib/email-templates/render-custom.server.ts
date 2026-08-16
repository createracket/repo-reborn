import * as React from 'react'
import { render } from '@react-email/render'
import { marked } from 'marked'
import { CustomEmail } from './custom-email'
import { sanitizeEmailHtml } from './sanitize-html.server'
import {
  applyMergeTags,
  escapeHtml,
  extractVariables,
  resolveSubject,
} from './merge-tags'

// Re-exported so existing import sites keep working. Prefer importing from
// './merge-tags' directly when no markdown/sanitising is needed.
export { applyMergeTags, escapeHtml, extractVariables, resolveSubject }

/** Render markdown body → sanitized HTML, with merge tags resolved first. */
export function renderBodyHtml(bodyMarkdown: string, data: Record<string, any>): string {
  // Apply merge tags BEFORE markdown so user-supplied values are escaped
  // and never interpreted as markdown syntax.
  const withVars = applyMergeTags(bodyMarkdown, data)
  const rawHtml = marked.parse(withVars, { async: false, breaks: true, gfm: true }) as string
  return sanitizeEmailHtml(rawHtml)
}


export function resolveSubject(subject: string, data: Record<string, any>): string {
  // Subjects are plain text — no HTML escaping needed in the resolved value.
  return subject.replace(MERGE_TAG, (_m, key) => {
    const v = data?.[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

export interface CustomTemplateInput {
  subject: string
  bodyMarkdown: string
}

export interface RenderedCustomEmail {
  subject: string
  html: string
  text: string
}

export async function renderCustomEmail(
  tpl: CustomTemplateInput,
  data: Record<string, any>,
): Promise<RenderedCustomEmail> {
  const resolvedSubject = resolveSubject(tpl.subject, data)
  const bodyHtml = renderBodyHtml(tpl.bodyMarkdown, data)
  const element = React.createElement(CustomEmail, {
    subject: resolvedSubject,
    bodyHtml,
    preview: resolvedSubject,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })
  return { subject: resolvedSubject, html, text }
}
