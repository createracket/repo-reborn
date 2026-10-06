import { createFileRoute } from "@tanstack/react-router";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Daily schedule: pulls new creator posts into reports with auto-add switched on. */
export const Route = createFileRoute("/api/public/hooks/report-post-discovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-scheduled-email-secret") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const env = process.env["SCHEDULED_EMAIL_SECRET"] ?? "";
        let ok = !!provided && !!env && safeEqual(provided, env);
        if (!ok && provided) {
          const { data } = await supabaseAdmin.from("scheduled_email_cron_token").select("token").maybeSingle();
          const t = (data?.token as string | undefined) ?? "";
          ok = !!t && safeEqual(provided, t);
        }
        if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const today = new Date().toISOString().slice(0, 10);
        const { data: reports } = await supabaseAdmin
          .from("campaign_reports")
          .select("id, auto_pull_end")
          .eq("auto_pull_posts" as never, true as never);

        const { discoverReportPosts } = await import("@/lib/report-post-discovery.server");
        const results: Record<string, unknown> = {};
        for (const r of ((reports ?? []) as Array<{ id: string; auto_pull_end: string | null }>).slice(0, 20)) {
          // Stop automatically a week after the campaign end date.
          if (r.auto_pull_end) {
            const stop = new Date(`${r.auto_pull_end}T00:00:00Z`);
            stop.setUTCDate(stop.getUTCDate() + 7);
            if (today > stop.toISOString().slice(0, 10)) {
              await supabaseAdmin.from("campaign_reports").update({ auto_pull_posts: false } as never).eq("id", r.id);
              continue;
            }
          }
          results[r.id] = await discoverReportPosts(supabaseAdmin, r.id);
        }
        return Response.json({ ok: true, results });
      },
    },
  },
});
