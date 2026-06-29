import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TrafficRange = "7d" | "30d" | "90d";

export type TrafficStats = {
  range: TrafficRange;
  since: string;
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
    bounceRate: number; // 0..1
    avgPagesPerSession: number;
  };
  daily: Array<{ date: string; pageviews: number; visitors: number }>;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
};

const RANGE_DAYS: Record<TrafficRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

export const getTrafficStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { range?: TrafficRange }) => ({
    range: (data?.range ?? "7d") as TrafficRange,
  }))
  .handler(async ({ data, context }): Promise<TrafficStats> => {
    const { supabase, userId } = context;

    // Verify admin role server-side
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Error("Forbidden");
    }

    const days = RANGE_DAYS[data.range] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();

    const { data: rows, error } = await supabase
      .from("page_views" as any)
      .select("session_id, path, referrer, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(50000);

    if (error) throw new Error(error.message);

    type Row = { session_id: string; path: string; referrer: string | null; created_at: string };
    const list = (rows as Row[] | null) ?? [];

    const sessionCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();
    const refCounts = new Map<string, number>();
    const dayMap = new Map<string, { pageviews: number; visitors: Set<string> }>();

    // Seed all days so the chart has zeros where needed
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { pageviews: 0, visitors: new Set() });
    }

    for (const r of list) {
      sessionCounts.set(r.session_id, (sessionCounts.get(r.session_id) ?? 0) + 1);
      pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
      const refHost = normaliseReferrer(r.referrer);
      if (refHost) refCounts.set(refHost, (refCounts.get(refHost) ?? 0) + 1);

      const dayKey = r.created_at.slice(0, 10);
      const bucket = dayMap.get(dayKey);
      if (bucket) {
        bucket.pageviews++;
        bucket.visitors.add(r.session_id);
      }
    }

    const sessions = sessionCounts.size;
    const pageviews = list.length;
    let bounced = 0;
    sessionCounts.forEach((count) => {
      if (count <= 1) bounced++;
    });

    return {
      range: data.range,
      since: sinceIso,
      totals: {
        pageviews,
        visitors: sessions, // session ≈ unique visitor (no cross-session id)
        sessions,
        bounceRate: sessions === 0 ? 0 : bounced / sessions,
        avgPagesPerSession: sessions === 0 ? 0 : pageviews / sessions,
      },
      daily: Array.from(dayMap.entries()).map(([date, v]) => ({
        date,
        pageviews: v.pageviews,
        visitors: v.visitors.size,
      })),
      topPages: Array.from(pageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([path, views]) => ({ path, views })),
      topReferrers: Array.from(refCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([referrer, views]) => ({ referrer, views })),
    };
  });

function normaliseReferrer(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
