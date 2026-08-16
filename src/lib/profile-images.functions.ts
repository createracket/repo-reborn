import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadMyProfileImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        base64: z.string().min(1).max(Math.ceil((8 * 1024 * 1024 * 4) / 3) + 8),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { uploadProfileImage } = await import("@/lib/profile-images.server");
    return uploadProfileImage(context.userId, data);
  });
