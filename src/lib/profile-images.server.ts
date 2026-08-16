import { z } from "zod";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8;

export const UploadProfileImageSchema = z.object({
  base64: z.string().min(1).max(MAX_BASE64_LENGTH),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

export type UploadProfileImageInput = z.infer<typeof UploadProfileImageSchema>;

/**
 * Upload a signed-in user's profile media (featured photos / video covers) into
 * the public spotlight-images bucket under a per-user folder.
 */
export async function uploadProfileImage(userId: string, input: UploadProfileImageInput) {
  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  } as const;

  const binary = atob(input.base64);
  const fileBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (fileBytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image must be under 8MB");

  const path = `profiles/${userId}/${crypto.randomUUID()}.${extensionByType[input.contentType]}`;
  const backendUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!backendUrl || !serviceKey) throw new Error("Image storage is not configured");

  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const headers = new Headers({
    apikey: serviceKey,
    "cache-control": "max-age=3600",
    "content-type": input.contentType,
    "x-upsert": "false",
  });
  if (!serviceKey.startsWith("sb_secret_")) headers.set("Authorization", `Bearer ${serviceKey}`);

  const response = await fetch(`${backendUrl}/storage/v1/object/spotlight-images/${objectPath}`, {
    method: "POST",
    headers,
    body: fileBytes,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(payload?.message ?? payload?.error ?? "Image upload failed");
  }

  return {
    publicUrl: `${backendUrl}/storage/v1/object/public/spotlight-images/${objectPath}`,
  };
}
