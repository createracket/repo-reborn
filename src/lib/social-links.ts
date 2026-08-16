/**
 * Shared helpers for rendering social links with @handles and for the
 * "secondary links" (band / podcast / side project) pattern used on both
 * spotlight pages and user profiles.
 */

export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "spotify",
  "apple_music",
  "youtube",
  "twitch",
  "facebook",
  "x",
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_LABELS: Record<SocialPlatformKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube: "YouTube",
  twitch: "Twitch",
  facebook: "Facebook",
  x: "X",
};

/** Turn a profile URL (or handle) into an @handle label for display. */
export function handleLabel(url: string): string {
  const value = (url ?? "").trim();
  if (!value) return "";
  if (value.startsWith("@")) return value;
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    return seg.startsWith("@") ? seg : `@${seg}`;
  } catch {
    return value;
  }
}

export type SecondaryLink = { url: string; name: string };

/** Read the `<platform>_extra` / `<platform>_extra_names` arrays out of a socials blob. */
export function readExtras(
  socials: Record<string, unknown> | null | undefined,
  platform: SocialPlatformKey,
): SecondaryLink[] {
  const urls = (socials?.[`${platform}_extra`] as string[] | undefined) ?? [];
  const names = (socials?.[`${platform}_extra_names`] as string[] | undefined) ?? [];
  return urls
    .map((url, i) => ({ url: (url ?? "").trim(), name: (names[i] ?? "").trim() }))
    .filter((l) => l.url.length > 0);
}
