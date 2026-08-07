import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch poster thumbnails for public TikTok URLs via the provider's oEmbed
 * endpoint. Instagram no longer serves public thumbnails, so those return null
 * and the UI falls back to a manual cover image or the gradient.
 */
export const getClipPosters = createServerFn({ method: "POST" })
  .inputValidator((data: { urls: string[] }) => ({
    urls: (data?.urls ?? []).filter((u) => typeof u === "string").slice(0, 6),
  }))
  .handler(async ({ data }) => {
    const out: Record<string, string | null> = {};
    await Promise.all(
      data.urls.map(async (url) => {
        out[url] = null;
        if (!/tiktok\.com/i.test(url)) return;
        try {
          const res = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
            { headers: { accept: "application/json" } },
          );
          if (!res.ok) return;
          const json = (await res.json()) as { thumbnail_url?: string };
          if (json?.thumbnail_url) out[url] = json.thumbnail_url;
        } catch {
          /* poster is optional */
        }
      }),
    );
    return { posters: out };
  });
