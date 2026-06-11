// Convert a public TikTok or Instagram URL into an embeddable preview.
// For TikTok we return an iframe src. For Instagram we return a direct media
// image URL (so we can render a clean thumbnail without the white IG chrome
// that the official /embed/ iframe forces).
export type SocialEmbed =
  | { kind: "iframe"; src: string; provider: "tiktok"; href: string }
  | { kind: "image"; src: string; provider: "instagram"; href: string };

export function getSocialEmbed(url: string): SocialEmbed | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // TikTok: https://www.tiktok.com/@user/video/1234567890
  if (host.endsWith("tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) {
      return {
        kind: "iframe",
        src: `https://www.tiktok.com/embed/v2/${m[1]}`,
        provider: "tiktok",
        href: url,
      };
    }
    return null;
  }

  // Instagram: /p/{id}/, /reel/{id}/, /tv/{id}/
  if (host.endsWith("instagram.com")) {
    const m = u.pathname.match(/\/(p|reel|tv)\/([^/]+)/);
    if (m) {
      return {
        kind: "image",
        src: `https://www.instagram.com/${m[1]}/${m[2]}/media/?size=l`,
        provider: "instagram",
        href: `https://www.instagram.com/${m[1]}/${m[2]}/`,
      };
    }
    return null;
  }

  return null;
}
