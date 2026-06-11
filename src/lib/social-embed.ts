// Convert a public TikTok or Instagram URL into an embeddable preview iframe.
// For Instagram we use the official /embed/ iframe (the public /media/?size=l
// thumbnail endpoint requires auth now and returns broken images). The
// rendering layer crops the white IG header/footer chrome via an oversized
// iframe inside an overflow-hidden container.
export type SocialEmbed = {
  kind: "iframe";
  src: string;
  provider: "tiktok" | "instagram";
  href: string;
};

export function getSocialEmbed(url: string): SocialEmbed | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

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

  if (host.endsWith("instagram.com")) {
    const m = u.pathname.match(/\/(p|reel|tv)\/([^/]+)/);
    if (m) {
      return {
        kind: "iframe",
        src: `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/`,
        provider: "instagram",
        href: `https://www.instagram.com/${m[1]}/${m[2]}/`,
      };
    }
    return null;
  }

  return null;
}
