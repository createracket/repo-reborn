import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { UploadSpotlightImageSchema, uploadSpotlightImage } from "@/lib/spotlight-images.server";

export const adminUploadSpotlightImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadSpotlightImageSchema.parse(input))
  .handler(async ({ context, data }) => uploadSpotlightImage(context.supabase, context.userId, data));