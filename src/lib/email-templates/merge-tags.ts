/**
 * Dependency-free merge-tag helpers.
 *
 * Kept separate from render-custom.server.ts so code paths that only need
 * merge-tag parsing (e.g. saving a template) never pull in markdown or
 * HTML-sanitiser libraries, which are not all runtime-compatible.
 */

const MERGE_TAG = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function escapeHtml(s: string): string {
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

/** Subjects are plain text — no HTML escaping in the resolved value. */
export function resolveSubject(subject: string, data: Record<string, any>): string {
  return subject.replace(MERGE_TAG, (_m, key) => {
    const v = data?.[key]
    return v === null || v === undefined ? '' : String(v)
  })
}
