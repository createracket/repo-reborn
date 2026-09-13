import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  assertSpotlightAdmin,
  MAX_UPLOAD_BYTES,
  putSpotlightObject,
  type SpotlightImageContentType,
  type SpotlightImageFolder,
} from "@/lib/spotlight-images.server";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,image/*,*/*",
};

const SUPPORTED: Record<string, SpotlightImageContentType> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

function metaContent(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? match[1].replace(/&amp;/g, "&").trim() : null;
}

/** Ask a provider's oEmbed endpoint for a thumbnail, when one exists. */
async function oembedThumbnail(pageUrl: string): Promise<string | null> {
  const endpoints: string[] = [];
  if (/tiktok\.com/i.test(pageUrl)) endpoints.push(`https://www.tiktok.com/oembed?url=${encodeURIComponent(pageUrl)}`);
  if (/youtube\.com|youtu\.be/i.test(pageUrl))
    endpoints.push(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`);
  if (/vimeo\.com/i.test(pageUrl))
    endpoints.push(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`);
  if (/soundcloud\.com/i.test(pageUrl))
    endpoints.push(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`);
  if (/instagram\.com|facebook\.com/i.test(pageUrl))
    endpoints.push(`https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(pageUrl)}`);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: { ...BROWSER_HEADERS, accept: "application/json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as { thumbnail_url?: string };
      if (json?.thumbnail_url) return json.thumbnail_url;
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Find a preview image URL on a page (oEmbed, og:image, JSON-LD, first image). */
async function resolvePreviewUrl(pageUrl: string): Promise<string | null> {
  const oembed = await oembedThumbnail(pageUrl);
  if (oembed) return oembed;

  const res = await fetch(pageUrl, { headers: BROWSER_HEADERS, redirect: "follow" });
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType && !contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text")) {
    return null;
  }
  const html = (await res.text()).slice(0, 1_500_000);

  const fromMeta =
    metaContent(html, /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i) ??
    metaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image[^"']*["']/i) ??
    metaContent(html, /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ??
    metaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ??
    metaContent(html, /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i) ??
    metaContent(html, /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (fromMeta) return fromMeta;

  // JSON-LD "image" values, either a string or an object/array with a url.
  const jsonLd =
    metaContent(html, /"image"\s*:\s*"(https?:\/\/[^"]+)"/i) ??
    metaContent(html, /"image"\s*:\s*\{[^}]*?"url"\s*:\s*"(https?:\/\/[^"]+)"/i) ??
    metaContent(html, /"image"\s*:\s*\[\s*"(https?:\/\/[^"]+)"/i) ??
    metaContent(html, /"thumbnailUrl"\s*:\s*"(https?:\/\/[^"]+)"/i);
  if (jsonLd) return jsonLd;

  // Last resort: the first reasonably sized <img> on the page.
  const imgMatches = html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp|gif)[^"']*)["']/gi);
  for (const match of imgMatches) {
    const candidate = match[1];
    if (!candidate || /sprite|icon|logo-?\d*\.|pixel|blank|1x1/i.test(candidate)) continue;
    return candidate.replace(/&amp;/g, "&");
  }

  return null;
}

/**
 * Take any link — a direct image, a social post, or a web page — pull its
 * preview image and store a permanent copy in our own bucket.
 */
export async function syncImageFromUrl(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { url: string; folder: SpotlightImageFolder },
) {
  await assertSpotlightAdmin(supabase, userId);

  const source = input.url.trim();
  let target: URL;
  try {
    target = new URL(source);
  } catch {
    throw new Error("That doesn't look like a valid link");
  }
  if (!/^https?:$/.test(target.protocol)) throw new Error("Only http(s) links are supported");

  // Already in our bucket — nothing to copy.
  if (source.includes("/storage/v1/object/public/spotlight-images/")) {
    return { publicUrl: source };
  }

  const typeOf = (res: Response) =>
    (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extType = (url: string): string | null => {
    const ext = url.split("?")[0].split("#")[0].toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)?.[1];
    if (!ext) return null;
    return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  };

  let imageUrl = source;
  let response: Response | null = await fetch(source, { headers: BROWSER_HEADERS, redirect: "follow" }).catch(
    () => null,
  );
  let contentType = response ? typeOf(response) : "";

  if (!response?.ok || !(contentType.startsWith("image/") || (!contentType && extType(source)))) {
    const preview = await resolvePreviewUrl(source).catch(() => null);
    if (!preview) {
      throw new Error(
        "Couldn't find a preview image on that link. Try the direct image address (right-click the image → Copy image address).",
      );
    }
    imageUrl = new URL(preview, source).toString();
    response = await fetch(imageUrl, { headers: { ...BROWSER_HEADERS, referer: source }, redirect: "follow" }).catch(
      () => null,
    );
    contentType = response ? typeOf(response) : "";
  }

  if (!response?.ok) throw new Error("Couldn't download that image");

  const mapped = SUPPORTED[contentType] ?? (extType(imageUrl) ? SUPPORTED[extType(imageUrl)!] : undefined);
  if (!mapped) throw new Error("That link isn't a JPG, PNG, WebP or GIF image");

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("That image was empty");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image must be under 8MB");

  return putSpotlightObject(bytes, mapped, input.folder);
}
