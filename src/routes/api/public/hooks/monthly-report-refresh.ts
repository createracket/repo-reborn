import { createFileRoute } from "@tanstack/react-router";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Called by the monthly schedule: queues "Update all metrics" for opted-in reports. */
export const Route = createFileRoute("/api/public/hooks/monthly-report-refresh")({
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

        // Only run on the 1st in Sydney (cron fires at both AEST and AEDT times).
        const sydDay = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric" }).format(new Date());
        const sydHour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", hour12: false }).format(new Date()));
        if (sydDay !== "1" || sydHour !== 2) return Response.json({ ok: true, skipped: "not 2am on the 1st in Sydney" });

        const { data: reports } = await supabaseAdmin
          .from("campaign_reports")
          .select("id, owner_id")
          .eq("auto_refresh_monthly" as never, true as never);

        let queued = 0;
        for (const r of (reports ?? []) as Array<{ id: string; owner_id: string }>) {
          const { data: running } = await supabaseAdmin
            .from("metric_jobs").select("id").eq("report_id", r.id).eq("status", "running").maybeSingle();
          if (running) continue;
          const { data: creators } = await supabaseAdmin
            .from("campaign_report_creators").select("id, name").eq("report_id", r.id);
          const ids = (creators ?? []).map((c) => c.id);
          if (!ids.length) continue;
          const { data: posts } = await supabaseAdmin
            .from("campaign_report_posts").select("id, post_url, creator_id, platform").in("creator_id", ids);
          const items = (posts ?? []).filter((p) => p.post_url?.trim());
          if (!items.length) continue;
          const { data: owner } = await supabaseAdmin.auth.admin.getUserById(r.owner_id);
          const { data: job } = await supabaseAdmin
            .from("metric_jobs")
            .insert({ report_id: r.id, total: items.length, notify_email: owner?.user?.email ?? null, created_by: r.owner_id })
            .select("id").single();
          if (!job) continue;
          const names = new Map((creators ?? []).map((c) => [c.id, c.name as string]));
          await supabaseAdmin.from("metric_job_items").insert(
            items.map((p) => ({ job_id: job.id, post_id: p.id, post_url: p.post_url, label: `${names.get(p.creator_id) ?? "Unknown"} · ${p.platform}` })),
          );
          queued++;
        }

        if (queued) {
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const origin = new URL(request.url).origin;
          if (key) {
            await fetch(`${origin}/api/public/hooks/report-metrics-worker`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: "{}",
            }).catch(() => {});
          }
        }
        return Response.json({ ok: true, queued });
      },
    },
  },
});
