// Convert a public TikTok or Instagram URL into an embeddable iframe src.
// Returns null if the URL isn't recognized.
export function getSocialEmbed(url: string): { src: string; provider: "tiktok" | "instagram" } | null {
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
    if (m) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, provider: "tiktok" };
    // vm.tiktok.com short links can't be resolved client-side; skip.
    return null;
  }

  // Instagram: /p/{id}/, /reel/{id}/, /tv/{id}/
  if (host.endsWith("instagram.com")) {
    const m = u.pathname.match(/\/(p|reel|tv)\/([^/]+)/);
    if (m) return { src: `https://www.instagram.com/${m[1]}/${m[2]}/embed/`, provider: "instagram" };
    return null;
  }

  return null;
}
