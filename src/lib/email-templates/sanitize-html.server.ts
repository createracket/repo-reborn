/**
 * Small allow-list HTML sanitiser.
 *
 * Runs in the serverless (Worker) runtime — no DOM, no jsdom. Input is
 * markdown-rendered HTML plus any raw HTML the admin typed into a template
 * body; merge-tag values are already HTML-escaped before markdown runs.
 */

const ALLOWED_TAGS = new Set([
  'a', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
])

const ALLOWED_ATTRS = new Set([
  'href', 'title', 'alt', 'src', 'width', 'height', 'style', 'target', 'rel',
])

/** Tags whose entire contents are dropped, not just the tag itself. */
const DROP_CONTENT_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript']

const SAFE_URI = /^(?:(?:https?|mailto|tel):|[#/])/i

const VOID_TAGS = new Set(['br', 'hr', 'img'])

function safeAttrValue(name: string, value: string): string | null {
  const v = value.trim()
  if (name === 'href' || name === 'src') {
    return SAFE_URI.test(v) ? v : null
  }
  if (name === 'style') {
    // Block anything that can fetch or execute.
    if (/expression|javascript:|url\s*\(|@import|behaviou?r\s*:/i.test(v)) return null
    return v
  }
  return v
}

function sanitizeAttrs(raw: string, tag: string): string {
  const out: string[] = []
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(raw))) {
    const name = m[1].toLowerCase()
    if (name.startsWith('on')) continue
    if (!ALLOWED_ATTRS.has(name)) continue
    const value = (m[2] ?? m[3] ?? m[4] ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const safe = safeAttrValue(name, m[2] ?? m[3] ?? m[4] ?? '')
    if (safe === null) continue
    out.push(`${name}="${value}"`)
  }
  if (tag === 'a') {
    if (!out.some((a) => a.startsWith('target='))) out.push('target="_blank"')
    if (!out.some((a) => a.startsWith('rel='))) out.push('rel="noreferrer"')
  }
  return out.length ? ' ' + out.join(' ') : ''
}

export function sanitizeEmailHtml(input: string): string {
  let html = input

  // Drop comments and any dangerous element together with its content.
  html = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const tag of DROP_CONTENT_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), '')
    html = html.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '')
  }

  return html.replace(
    /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    (_match, closing: string | undefined, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) return ''
      if (closing) return VOID_TAGS.has(tag) ? '' : `</${tag}>`
      const attrs = sanitizeAttrs(rawAttrs ?? '', tag)
      return VOID_TAGS.has(tag) ? `<${tag}${attrs} />` : `<${tag}${attrs}>`
    },
  )
}
