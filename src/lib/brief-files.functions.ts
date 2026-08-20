import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: mint a short-lived download link for a brief attachment. */
export const getBriefFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1).max(300) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!role) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("brief-uploads")
      .createSignedUrl(data.path, 300, { download: true });
    if (error || !signed?.signedUrl) throw new Error(error?.message ?? "Could not create link");
    return { url: signed.signedUrl };
  });
