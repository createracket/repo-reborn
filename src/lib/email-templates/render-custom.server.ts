import * as React from 'react'
import { render } from '@react-email/render'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { CustomEmail } from './custom-email'

const MERGE_TAG = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Replace `{{var}}` with HTML-escaped values from data. Missing → empty string. */
export function applyMergeTags(input: string, data: Record<string, any>): string {
  return input.replace(MERGE_TAG, (_match, key) => {
    const v = data?.[key]
    if (v === null || v === undefined) return ''
    return escapeHtml(String(v))
  })
}

/** Extract unique merge-tag names from subject + body. */
export function extractVariables(...sources: string[]): string[] {
  const set = new Set<string>()
  for (const src of sources) {
    if (!src) continue
    for (const m of src.matchAll(MERGE_TAG)) set.add(m[1])
  }
  return Array.from(set).sort()
}

const SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    'a', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'style', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
}

/** Render markdown body → sanitized HTML, with merge tags resolved first. */
export function renderBodyHtml(bodyMarkdown: string, data: Record<string, any>): string {
  // Apply merge tags BEFORE markdown so user-supplied values are escaped
  // and never interpreted as markdown syntax.
  const withVars = applyMergeTags(bodyMarkdown, data)
  const rawHtml = marked.parse(withVars, { async: false, breaks: true, gfm: true }) as string
  return DOMPurify.sanitize(rawHtml, SANITIZE_OPTS)
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
