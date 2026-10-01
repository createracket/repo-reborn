import { createFileRoute } from "@tanstack/react-router";

const COLUMNS = [
  "report", "creator", "handle", "platform", "post_url", "posted_date", "views", "likes",
  "comments", "shares", "saves", "followers", "engagement_rate", "is_extra_mention",
  "metrics_updated_at",
] as const;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function text(body: string, status: number) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const Route = createFileRoute("/report/$slug/metrics.csv")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug;
        if (!/^[a-z0-9-]{1,120}$/i.test(slug)) return text("Report not found", 404);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Same visibility rule as the public page: published and no access code.
        const { data: report } = await supabaseAdmin
          .from("campaign_reports")
          .select("id, title, slug")
          .eq("slug", slug)
          .eq("published", true)
          .is("access_code", null)
          .maybeSingle();
        if (!report) return text("Report not found", 404);

        const { data: creators } = await supabaseAdmin
          .from("campaign_report_creators")
          .select("id, name, handle, position")
          .eq("report_id", report.id)
          .order("position", { ascending: true });
        const ids = (creators ?? []).map((c) => c.id);
        const { data: posts } = ids.length
          ? await supabaseAdmin
              .from("campaign_report_posts")
              .select("creator_id, platform, post_url, posted_at, views, likes, comments, shares, saves, followers, engagement_rate_pct, extra_mention, metrics_updated_at, position")
              .in("creator_id", ids)
              .order("position", { ascending: true })
          : { data: [] as any[] };

        const byCreator = new Map((creators ?? []).map((c) => [c.id, c]));
        const order = new Map(ids.map((id, i) => [id, i]));
        const rows = [...(posts ?? [])].sort(
          (a, b) => (order.get(a.creator_id) ?? 0) - (order.get(b.creator_id) ?? 0) || a.position - b.position,
        );

        const lines = [COLUMNS.join(",")];
        for (const p of rows) {
          const c = byCreator.get(p.creator_id);
          lines.push(
            [
              report.title, c?.name, c?.handle, p.platform, p.post_url,
              p.posted_at ? String(p.posted_at).slice(0, 10) : "",
              p.views, p.likes, p.comments, p.shares, p.saves, p.followers,
              p.engagement_rate_pct != null ? Number(p.engagement_rate_pct).toFixed(2) : "",
              p.extra_mention ? "true" : "false",
              p.metrics_updated_at ?? "",
            ].map(cell).join(","),
          );
        }

        const month = new Date().toISOString().slice(0, 7);
        return new Response(lines.join("\r\n") + "\r\n", {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${report.slug}-metrics-${month}.csv"`,
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
