// Builds report/roster data feeds (CSV + JSON). Never exposes notes, emails or tokens.
type Fmt = "csv" | "json";

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function notFound() {
  return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}

export function respond(fmt: Fmt, name: string, columns: readonly string[], rows: Record<string, unknown>[], meta: Record<string, unknown>, isPrivate = false) {
  const headers: Record<string, string> = {
    "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
  };
  if (fmt === "json") {
    return new Response(JSON.stringify({ ...meta, generated_at: new Date().toISOString(), columns, rows }, null, 2), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  }
  const lines = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))];
  const month = new Date().toISOString().slice(0, 7);
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${month}.csv"` },
  });
}

const slugOk = (s: string) => /^[a-z0-9-]{1,120}$/i.test(s);

export const REPORT_COLUMNS = [
  "report", "creator", "handle", "platform", "post_url", "posted_date", "views", "likes",
  "comments", "shares", "saves", "followers", "engagement_rate", "is_extra_mention", "metrics_updated_at",
] as const;
export const DETAILED_EXTRA = ["data_source", "account_synced_at", "account_connected"] as const;

export async function reportFeed(slug: string, fmt: Fmt, detailed: boolean, key: string | null) {
  if (!slugOk(slug)) return notFound();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: report } = await supabaseAdmin
    .from("campaign_reports")
    .select("id, title, slug, published, access_code, data_feed_key")
    .eq("slug", slug).maybeSingle();
  if (!report || !report.published) return notFound();
  if (detailed) {
    if (!report.data_feed_key || !key || key !== report.data_feed_key) return notFound();
  } else if (report.access_code) return notFound();

  const { data: creators } = await supabaseAdmin
    .from("campaign_report_creators").select("id, name, handle, position")
    .eq("report_id", report.id).order("position", { ascending: true });
  const ids = (creators ?? []).map((c) => c.id);
  const { data: posts } = ids.length
    ? await supabaseAdmin.from("campaign_report_posts")
        .select("creator_id, platform, post_url, posted_at, views, likes, comments, shares, saves, followers, engagement_rate_pct, extra_mention, metrics_updated_at, account_synced_at, position")
        .in("creator_id", ids).order("position", { ascending: true })
    : { data: [] as any[] };
  const conns = detailed && ids.length
    ? (await supabaseAdmin.from("creator_social_connections").select("creator_id, platform").in("creator_id", ids)).data ?? []
    : [];
  const connected = new Set(conns.map((c) => `${c.creator_id}:${c.platform}`));
  const byCreator = new Map((creators ?? []).map((c) => [c.id, c]));
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...(posts ?? [])].sort((a: any, b: any) =>
    (order.get(a.creator_id) ?? 0) - (order.get(b.creator_id) ?? 0) || a.position - b.position);

  const rows = sorted.map((p: any) => {
    const c = byCreator.get(p.creator_id);
    const row: Record<string, unknown> = {
      report: report.title, creator: c?.name, handle: c?.handle, platform: p.platform, post_url: p.post_url,
      posted_date: p.posted_at ? String(p.posted_at).slice(0, 10) : "",
      views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves, followers: p.followers,
      engagement_rate: p.engagement_rate_pct != null ? Number(p.engagement_rate_pct).toFixed(2) : "",
      is_extra_mention: p.extra_mention ? "true" : "false",
      metrics_updated_at: p.metrics_updated_at ?? "",
    };
    if (detailed) {
      row.data_source = p.account_synced_at ? "creator_account" : "public";
      row.account_synced_at = p.account_synced_at ?? "";
      row.account_connected = connected.has(`${p.creator_id}:${p.platform}`) ? "true" : "false";
    }
    return row;
  });
  const columns = detailed ? [...REPORT_COLUMNS, ...DETAILED_EXTRA] : REPORT_COLUMNS;
  return respond(fmt, `${report.slug}-${detailed ? "detailed" : "metrics"}`, columns, rows,
    { report: report.title, slug: report.slug, feed: detailed ? "detailed" : "public" }, detailed);
}

export const ROSTER_COLUMNS = [
  "roster", "creator", "status", "categories", "location", "total_social_followers", "spotify_monthly_listeners",
  "instagram_url", "instagram_followers", "tiktok_url", "tiktok_followers", "youtube_url", "youtube_subscribers",
  "facebook_url", "facebook_followers", "x_url", "x_followers", "twitch_url", "twitch_followers",
  "posting_dates", "roster_updated_at",
] as const;

export async function rosterFeed(slug: string, fmt: Fmt) {
  if (!slugOk(slug)) return notFound();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Same visibility as the public page: published, no access code, hidden creators excluded.
  const { data: bundle } = await (supabaseAdmin as any).rpc("get_public_roster", { p_slug: slug });
  const r = bundle?.roster;
  if (!r) return notFound();
  const rows = ((bundle.items ?? []) as any[]).map((i) => {
    const social = ["instagram_followers", "tiktok_followers", "youtube_subscribers", "facebook_followers", "x_followers", "twitch_followers", "custom_followers"]
      .reduce((s, k) => s + (Number(i[k]) || 0), 0);
    const dates = [i.posting_date, ...(i.extra_posting_dates ?? [])].filter(Boolean).sort();
    return {
      roster: r.title, creator: i.name, status: i.status, categories: (i.categories?.length ? i.categories : i.category ? [i.category] : []).join("; "),
      location: i.location, total_social_followers: social || "", spotify_monthly_listeners: i.spotify_monthly_listens,
      instagram_url: i.instagram_url, instagram_followers: i.instagram_followers, tiktok_url: i.tiktok_url, tiktok_followers: i.tiktok_followers,
      youtube_url: i.youtube_url, youtube_subscribers: i.youtube_subscribers, facebook_url: i.facebook_url, facebook_followers: i.facebook_followers,
      x_url: i.x_url, x_followers: i.x_followers, twitch_url: i.twitch_url, twitch_followers: i.twitch_followers,
      posting_dates: dates.join("; "), roster_updated_at: r.updated_at ?? "",
    };
  });
  return respond(fmt, `${r.slug}-creators`, ROSTER_COLUMNS, rows, { roster: r.title, slug: r.slug, feed: "public" });
}
