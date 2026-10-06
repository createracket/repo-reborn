import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin "Check for new posts now" button. */
export const checkReportForNewPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reportId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { discoverReportPosts } = await import("./report-post-discovery.server");
    return discoverReportPosts(supabaseAdmin, data.reportId);
  });

/** Removing an auto-added post remembers it so it is never re-added. */
export const dismissReportPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ postId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { postKey } = await import("./report-post-discovery.server");
    const { data: post } = await context.supabase
      .from("campaign_report_posts").select("post_url, creator_id").eq("id", data.postId).maybeSingle();
    const { data: creator } = post
      ? await context.supabase.from("campaign_report_creators").select("report_id").eq("id", post.creator_id).maybeSingle()
      : { data: null };
    const key = postKey(post?.post_url);
    if (key && creator) {
      await context.supabase
        .from("campaign_report_dismissed_posts")
        .upsert({ report_id: creator.report_id, post_key: key }, { onConflict: "report_id,post_key" });
    }
    const { error } = await context.supabase.from("campaign_report_posts").delete().eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
