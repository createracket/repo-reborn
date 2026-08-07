import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminUploadSpotlightImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    base64: z.string().min(1).max(Math.ceil(((8 * 1024 * 1024) * 4) / 3) + 8),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    folder: z.enum(["spotlights", "video-covers"]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { uploadSpotlightImage } = await import("@/lib/spotlight-images.server");
    return uploadSpotlightImage(context.supabase, context.userId, data);
  });