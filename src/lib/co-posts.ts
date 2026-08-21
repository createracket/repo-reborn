/**
 * Co-posted roster entries.
 *
 * A roster item has one lead creator (the normal fields) plus optional
 * co-post collaborators: up to 2 extra links per platform (Instagram, TikTok,
 * YouTube and Spotify). Stored on `roster_items.co_posts` as a JSON array.
 */

export type CoPostPlatform = "instagram" | "tiktok" | "youtube" | "spotify";

export type CoPost = {
  platform: CoPostPlatform;
  name: string;
  url: string;
  followers: number | null;
};

export const CO_POST_PLATFORMS: CoPostPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "spotify",
];

/** Spotify counts as streaming, not social audience. */
export const CO_POST_STREAMING_PLATFORMS: CoPostPlatform[] = ["spotify"];

export const MAX_CO_POSTS_PER_PLATFORM = 2;

export function parseCoPosts(value: unknown): CoPost[] {
  if (!Array.isArray(value)) return [];
  const out: CoPost[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const platform = CO_POST_PLATFORMS.includes(r.platform as CoPostPlatform)
      ? (r.platform as CoPostPlatform)
      : null;
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

function sum(list: CoPost[]): number {
  return list.reduce((total, c) => total + (c.followers ?? 0), 0);
}

/** Follower counts from social co-posts (excludes streaming platforms). */
export function coPostSocialAudience(value: unknown): number {
  return sum(parseCoPosts(value).filter((c) => !CO_POST_STREAMING_PLATFORMS.includes(c.platform)));
}

/** Streaming numbers (Spotify monthly listeners) from co-posts. */
export function coPostStreamingAudience(value: unknown): number {
  return sum(parseCoPosts(value).filter((c) => CO_POST_STREAMING_PLATFORMS.includes(c.platform)));
}

/** Combined follower count contributed by co-post collaborators. */
export function coPostAudience(value: unknown): number {
  return sum(parseCoPosts(value));
}

const SHORT_LABEL: Record<CoPostPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  spotify: "Spotify",
};

export const CO_POST_PLATFORM_LABEL: Record<CoPostPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  spotify: "Spotify",
};

export function coPostLabel(c: CoPost): string {
  const platform = SHORT_LABEL[c.platform];
  return c.name ? `${platform} · ${c.name}` : `${platform} co-post`;
}
