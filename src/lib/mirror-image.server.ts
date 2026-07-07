// Server-only: mirror a remote image (Instagram/TikTok/Spotify/Apple/etc CDN)
// into our own Supabase storage bucket so the URL doesn't expire or 403 on
// hotlink. Returns the mirrored public URL, or null on failure (caller should
// fall back to the original URL).

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Fetch `url` and re-upload the bytes into `avatars/mirrored/<folder>/`.
 * Uses the service-role client so RLS is bypassed. Never throws.
 */
export async function mirrorExternalImage(
  url: string | null | undefined,
  folder: string,
): Promise<string | null> {
  if (!url) return null;
  // If it's already one of our storage URLs, don't re-mirror.
  if (url.includes("/storage/v1/object/public/avatars/")) return url;
  try {
    const res = await fetch(url, {
      // Some CDNs (Instagram) 403 without a referer/UA.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/*",
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    const ext = EXT_BY_TYPE[contentType] ?? "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 8 * 1024 * 1024) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `mirrored/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, bytes, { contentType, cacheControl: "31536000", upsert: false });
    if (error) return null;
    const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}
