/**
 * Co-posted roster entries.
 *
 * A roster item has one lead creator (the normal fields) plus optional
 * co-post collaborators: up to 2 extra Instagram links and 2 extra TikTok
 * links. Stored on `roster_items.co_posts` as a JSON array.
 */

export type CoPostPlatform = "instagram" | "tiktok";

export type CoPost = {
  platform: CoPostPlatform;
  name: string;
  url: string;
  followers: number | null;
};

export const MAX_CO_POSTS_PER_PLATFORM = 2;

export function parseCoPosts(value: unknown): CoPost[] {
  if (!Array.isArray(value)) return [];
  const out: CoPost[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const platform = r.platform === "tiktok" ? "tiktok" : r.platform === "instagram" ? "instagram" : null;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!platform || !url) continue;
    const followersRaw = r.followers;
    const followers =
      typeof followersRaw === "number" && Number.isFinite(followersRaw) ? followersRaw : null;
    if (out.filter((c) => c.platform === platform).length >= MAX_CO_POSTS_PER_PLATFORM) continue;
    out.push({
      platform,
      name: typeof r.name === "string" ? r.name.trim() : "",
      url,
      followers,
    });
  }
  return out;
}

/** Combined follower count contributed by co-post collaborators. */
export function coPostAudience(value: unknown): number {
  return parseCoPosts(value).reduce((sum, c) => sum + (c.followers ?? 0), 0);
}

export function coPostLabel(c: CoPost): string {
  const platform = c.platform === "tiktok" ? "TT" : "IG";
  return c.name ? `${platform} · ${c.name}` : `${platform} co-post`;
}
