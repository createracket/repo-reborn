import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin: pull the preview image from any link and save it to our storage. */
export const adminSyncImageFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    url: z.string().min(1).max(2048),
    folder: z.enum(["spotlights", "video-covers", "sound-board"]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { syncImageFromUrl } = await import("@/lib/image-sync.server");
    return syncImageFromUrl(context.supabase, context.userId, data);
  });
