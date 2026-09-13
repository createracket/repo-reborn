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

/** Find a preview image URL on a page (og:image, twitter:image, oEmbed). */
async function resolvePreviewUrl(pageUrl: string): Promise<string | null> {
  if (/tiktok\.com/i.test(pageUrl)) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(pageUrl)}`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as { thumbnail_url?: string };
        if (json?.thumbnail_url) return json.thumbnail_url;
      }
    } catch {
      /* fall through to HTML scrape */
    }
  }

  const res = await fetch(pageUrl, { headers: BROWSER_HEADERS });
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("html")) return null;
  const html = (await res.text()).slice(0, 400_000);

  return (
    metaContent(html, /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
    metaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
    metaContent(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
    null
  );
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

  let imageUrl = source;
  let response = await fetch(source, { headers: BROWSER_HEADERS });
  let contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  if (!contentType.startsWith("image/")) {
    const preview = await resolvePreviewUrl(source);
    if (!preview) throw new Error("No preview image found on that link");
    imageUrl = new URL(preview, source).toString();
    response = await fetch(imageUrl, { headers: BROWSER_HEADERS });
    contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  }

  if (!response.ok) throw new Error("Couldn't download that image");

  const mapped = SUPPORTED[contentType];
  if (!mapped) throw new Error("That link isn't a JPG, PNG, WebP or GIF image");

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("That image was empty");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image must be under 8MB");

  return putSpotlightObject(bytes, mapped, input.folder);
}
