import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8;

export const UploadSpotlightImageSchema = z.object({
  base64: z.string().min(1).max(MAX_BASE64_LENGTH),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  folder: z.enum(["spotlights", "video-covers"]),
});

export type UploadSpotlightImageInput = z.infer<typeof UploadSpotlightImageSchema>;

export async function uploadSpotlightImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: UploadSpotlightImageInput,
) {
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) throw new Error(roleError.message);
  if (!role) throw new Error("Admin access required");

  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  } as const;
  const binary = atob(input.base64);
  const fileBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (fileBytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image must be under 8MB");

  const path = `${input.folder}/${crypto.randomUUID()}.${extensionByType[input.contentType]}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("spotlight-images").upload(path, fileBytes, {
    cacheControl: "3600",
    contentType: input.contentType,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("spotlight-images").getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}