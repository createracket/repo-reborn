// Client-safe helpers for turning whatever a user typed into a canonical
// profile URL before we hand it to the follower-sync server functions.
export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitch"
  | "facebook"
  | "x";

/**
 * Accepts a full URL, a scheme-less link, a bare handle or an @handle and
 * returns a canonical profile URL for the platform (or null when empty).
 */
export function toProfileUrl(platform: SocialPlatform, raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value)) return `https://${value}`;

  const handle = value.replace(/^@/, "").split(/[?#/]/)[0].trim();
  if (!handle) return null;

  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "twitch":
      return `https://www.twitch.tv/${handle}`;
    case "facebook":
      return `https://www.facebook.com/${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    default:
      return null;
  }
}
