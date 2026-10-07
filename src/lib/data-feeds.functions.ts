import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin: get (or create / reset) a report's private detailed-feed key. */
export const getReportFeedKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid(), reset: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can manage data feeds.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("campaign_reports").select("slug, data_feed_key").eq("id", data.reportId).maybeSingle();
    if (!r) throw new Error("Report not found");
    let key = r.data_feed_key;
    if (!key || data.reset) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
      await supabaseAdmin.from("campaign_reports").update({ data_feed_key: key }).eq("id", data.reportId);
    }
    return { slug: r.slug as string, key };
  });
