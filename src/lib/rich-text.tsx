/**
 * Client-safe inline rich text: admins can type simple HTML (bold, italic,
 * links, lists, line breaks) into spotlight/brief content fields and it renders
 * as formatted text instead of escaped markup.
 */

const ALLOWED_TAGS = new Set([
  "a", "p", "br", "strong", "em", "b", "i", "u", "s",
  "ul", "ol", "li", "blockquote", "span",
]);

const ALLOWED_ATTRS = new Set(["href", "title", "target", "rel"]);

const DROP_CONTENT_TAGS = ["script", "style", "iframe", "object", "embed", "form", "noscript"];

const SAFE_URI = /^(?:(?:https?|mailto|tel):|[#/])/i;

const VOID_TAGS = new Set(["br"]);

function sanitizeAttrs(raw: string, tag: string): string {
  const out: string[] = [];
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(raw))) {
    const name = m[1].toLowerCase();
    if (name.startsWith("on")) continue;
    if (!ALLOWED_ATTRS.has(name)) continue;
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (name === "href" && !SAFE_URI.test(value.trim())) continue;
    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    out.push(`${name}="${escaped}"`);
  }
  if (tag === "a") {
    if (!out.some((a) => a.startsWith("target="))) out.push('target="_blank"');
    if (!out.some((a) => a.startsWith("rel="))) out.push('rel="noreferrer"');
  }
  return out.length ? " " + out.join(" ") : "";
}

export function sanitizeRichText(input: string): string {
  let html = input.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of DROP_CONTENT_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), "");
  }
  return html.replace(
    /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    (_match, closing: string | undefined, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      const attrs = sanitizeAttrs(rawAttrs ?? "", tag);
      return VOID_TAGS.has(tag) ? `<${tag} />` : `<${tag}${attrs}>`;
    },
  );
}

/** True when the value contains any markup we'd render. */
export function hasMarkup(value: string): boolean {
  return /<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?>/.test(value);
}

/**
 * Renders admin-authored copy. Plain text keeps its line breaks; text with
 * simple HTML is sanitised and rendered as markup.
 */
export function RichText({
  value,
  className,
  as: Tag = "p",
}: {
  value: string;
  className?: string;
  as?: "p" | "div";
}) {
  if (!hasMarkup(value)) {
    return <Tag className={className}>{value}</Tag>;
  }
  return (
    <Tag
      className={`${className ?? ""} [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
