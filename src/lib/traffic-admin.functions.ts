import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TrafficRange = "7d" | "30d" | "90d";
export type TrafficFilter = "humans" | "bots" | "all";

export type TrafficStats = {
  range: TrafficRange;
  filter: TrafficFilter;
  includeSelf: boolean;
  excludedSelfPageviews: number;
  since: string;
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
    bounceRate: number;
    avgPagesPerSession: number;
    humanPageviews: number;
    botPageviews: number;
  };
  daily: Array<{ date: string; pageviews: number; visitors: number; bots: number }>;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  topCountries: Array<{ country: string; views: number; humans: number; bots: number }>;
  topBotReasons: Array<{ reason: string; views: number }>;
};

const RANGE_DAYS: Record<TrafficRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

export const getTrafficStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { range?: TrafficRange; filter?: TrafficFilter; includeSelf?: boolean }) => ({
    range: (data?.range ?? "7d") as TrafficRange,
    filter: (data?.filter ?? "humans") as TrafficFilter,
    includeSelf: data?.includeSelf === true,
  }))

  .handler(async ({ data, context }): Promise<TrafficStats> => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const days = RANGE_DAYS[data.range] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();

    const { data: rows, error } = await supabase
      .from("page_views" as any)
      .select("session_id, path, referrer, created_at, is_bot, bot_reason, country, user_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(50000);

    if (error) throw new Error(error.message);

    type Row = {
      session_id: string;
      path: string;
      referrer: string | null;
      created_at: string;
      is_bot: boolean | null;
      bot_reason: string | null;
      country: string | null;
      user_id: string | null;
    };
    const raw = (rows as unknown as Row[] | null) ?? [];

    // Isolate the signed-in admin's own activity: drop every pageview from any
    // browser session that was ever tied to this admin account.
    const mySessions = new Set(
      raw.filter((r) => r.user_id === userId).map((r) => r.session_id),
    );
    const all = data.includeSelf ? raw : raw.filter((r) => !mySessions.has(r.session_id));
    const excludedSelfPageviews = raw.length - all.length;

    const humanPageviews = all.filter((r) => !r.is_bot).length;
    const botPageviews = all.length - humanPageviews;

    const list =
      data.filter === "humans" ? all.filter((r) => !r.is_bot)
      : data.filter === "bots" ? all.filter((r) => r.is_bot)
      : all;


    const sessionCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();
    const refCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    const countryMap = new Map<string, { views: number; humans: number; bots: number }>();
    const dayMap = new Map<string, { pageviews: number; visitors: Set<string>; bots: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), { pageviews: 0, visitors: new Set(), bots: 0 });
    }

    for (const r of list) {
      sessionCounts.set(r.session_id, (sessionCounts.get(r.session_id) ?? 0) + 1);
      pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
      const refHost = normaliseReferrer(r.referrer);
      if (refHost) refCounts.set(refHost, (refCounts.get(refHost) ?? 0) + 1);

      const country = r.country || "Unknown";
      const c = countryMap.get(country) ?? { views: 0, humans: 0, bots: 0 };
      c.views++;
      if (r.is_bot) c.bots++; else c.humans++;
      countryMap.set(country, c);

      if (r.is_bot) {
        const reason = r.bot_reason || "Unknown";
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }

      const dayKey = r.created_at.slice(0, 10);
      const bucket = dayMap.get(dayKey);
      if (bucket) {
        bucket.pageviews++;
        bucket.visitors.add(r.session_id);
        if (r.is_bot) bucket.bots++;
      }
    }

    const sessions = sessionCounts.size;
    const pageviews = list.length;
    let bounced = 0;
    sessionCounts.forEach((count) => { if (count <= 1) bounced++; });

    return {
      range: data.range,
      filter: data.filter,
      since: sinceIso,
      totals: {
        pageviews,
        visitors: sessions,
        sessions,
        bounceRate: sessions === 0 ? 0 : bounced / sessions,
        avgPagesPerSession: sessions === 0 ? 0 : pageviews / sessions,
        humanPageviews,
        botPageviews,
      },
      daily: Array.from(dayMap.entries()).map(([date, v]) => ({
        date, pageviews: v.pageviews, visitors: v.visitors.size, bots: v.bots,
      })),
      topPages: Array.from(pageCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([path, views]) => ({ path, views })),
      topReferrers: Array.from(refCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([referrer, views]) => ({ referrer, views })),
      topCountries: Array.from(countryMap.entries()).sort((a, b) => b[1].views - a[1].views).slice(0, 20)
        .map(([country, v]) => ({ country, ...v })),
      topBotReasons: Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([reason, views]) => ({ reason, views })),
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
