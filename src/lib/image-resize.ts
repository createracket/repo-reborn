// Client-side image downscale + JPEG re-encode. Keeps uploads small (<=1080px longest side)
// and consistent so we don't burn storage/bandwidth on huge phone photos.
export async function resizeImageFile(
  file: File,
  maxSize = 1080,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip GIFs/SVGs — canvas would break animation / rasterize vectors.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
