// Reserved slugs that can't be used as profile URLs — avoids clashes with app
// routes and impersonation of system/staff/brand handles.
export const RESERVED_SLUGS = new Set<string>([
  "admin", "administrator", "staff", "team", "support", "help", "moderator", "mod",
  "createracket", "create-racket", "racket", "official", "system", "root", "owner",
  "api", "app", "auth", "login", "logout", "signup", "signin", "register",
  "dashboard", "profile", "settings", "account", "billing", "pricing", "checkout",
  "contact", "about", "terms", "privacy", "legal", "press", "blog", "news",
  "u", "users", "user", "p", "post", "posts", "search", "explore", "discover",
  "vibe-check", "vibecheck", "connect", "brief", "briefs", "spotlight", "results",
  "brand", "brands", "artist", "artists", "agency", "agencies", "fan", "fans",
  "home", "index", "null", "undefined", "anonymous",
]);

export type SlugValidation =
  | { ok: true; normalized: string }
  | { ok: false; normalized: string; reason: string };

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function validateSlug(input: string): SlugValidation {
  const normalized = normalizeSlug(input);
  if (!normalized) return { ok: false, normalized, reason: "Slug can't be empty" };
  if (normalized.length < 2) return { ok: false, normalized, reason: "Slug must be at least 2 characters" };
  if (normalized.length > 30) return { ok: false, normalized, reason: "Slug must be 30 characters or fewer" };
  if (!/^[a-z0-9]/.test(normalized)) return { ok: false, normalized, reason: "Slug must start with a letter or number" };
  if (/--/.test(normalized)) return { ok: false, normalized, reason: "Slug can't contain consecutive hyphens" };
  if (/-$/.test(normalized)) return { ok: false, normalized, reason: "Slug can't end with a hyphen" };
  if (RESERVED_SLUGS.has(normalized)) return { ok: false, normalized, reason: "That slug is reserved — try another" };
  return { ok: true, normalized };
}
