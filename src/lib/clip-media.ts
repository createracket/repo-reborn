import { getSocialEmbed } from "@/lib/social-embed";

export type ClipMedia = {
  href: string;
  posterKey: string;
  provider: "tiktok" | "instagram" | "dropbox";
  videoSrc: string | null;
};

const DROPBOX_HOSTS = new Set(["dropbox.com", "www.dropbox.com"]);
const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|ogv)$/i;

/**
 * Converts a Dropbox single-file share link to its direct media URL.
 * Folder links remain external because Dropbox serves those as a ZIP download.
 */
export function getClipMedia(url: string | null | undefined): ClipMedia | null {
  if (!url?.trim()) return null;

  const social = getSocialEmbed(url);
  if (social) {
    return {
      href: social.href,
      posterKey: social.href,
      provider: social.provider,
      videoSrc: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !DROPBOX_HOSTS.has(parsed.hostname)) return null;

  const href = parsed.toString();
  const isFolder = /\/scl\/fo\//i.test(parsed.pathname) || /\/sh\//i.test(parsed.pathname);
  const isFile = /\/scl\/fi\//i.test(parsed.pathname) || VIDEO_FILE_RE.test(parsed.pathname);
  if (isFolder || !isFile) {
    return { href, posterKey: href, provider: "dropbox", videoSrc: null };
  }

  parsed.searchParams.delete("dl");
  parsed.searchParams.set("raw", "1");
  return {
    href,
    posterKey: href,
    provider: "dropbox",
    videoSrc: parsed.toString(),
  };
}
