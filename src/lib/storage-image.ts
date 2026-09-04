// Serve Supabase Storage images through the on-the-fly image transform endpoint
// so we don't ship full-size uploads into tiny avatars/headers.
// Non-storage URLs (Instagram CDN, external links) are returned untouched.

const PUBLIC_OBJECT = "/storage/v1/object/public/";

export function storageImage(
  url: string | null | undefined,
  opts: { width: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" },
): string | undefined {
  if (!url) return undefined;
  if (!url.includes(PUBLIC_OBJECT)) return url;

  const transformed = url.replace(PUBLIC_OBJECT, "/storage/v1/render/image/public/");
  const params = new URLSearchParams();
  params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  params.set("resize", opts.resize ?? "cover");
  params.set("quality", String(opts.quality ?? 75));
  return `${transformed}?${params.toString()}`;
}
