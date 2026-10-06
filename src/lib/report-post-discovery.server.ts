// Server-only: finds new posts on report creators' channels and adds them.
import { mirrorExternalImage } from "./mirror-image.server";

type Admin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

export function postKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const ig = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) return `ig:${ig[1]}`;
  const tt = url.match(/tiktok\.com\/.*\/(?:video|photo)\/(\d+)/);
  if (tt) return `tt:${tt[1]}`;
  return url.split(/[?#]/)[0].replace(/\/$/, "").toLowerCase();
}

type Found = {
  platform: "instagram" | "tiktok";
  post_url: string;
  posted_at: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  followers: number | null;
  hashtags: string[];
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

async function apify(actor: string, input: unknown, token: string): Promise<unknown[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=180`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
  );
  if (!res.ok) throw new Error(`Social data service error ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()) as unknown[];
}

async function latestInstagram(handle: string, token: string): Promise<Found[]> {
  const rows = (await apify(
    "apify~instagram-post-scraper",
    { username: [handle], resultsLimit: 40, addParentData: false },
    token,
  )) as Array<Record<string, any>>;
  return rows
    .filter((p) => p.url || p.shortCode)
    .map((p) => ({
      platform: "instagram" as const,
      post_url: p.url ?? `https://www.instagram.com/p/${p.shortCode}/`,
      posted_at: p.timestamp ?? null,
      caption: p.caption ?? null,
      thumbnail_url: p.displayUrl ?? null,
      views: num(p.videoPlayCount ?? p.videoViewCount),
      likes: num(p.likesCount),
      comments: num(p.commentsCount),
      shares: null,
      saves: null,
      followers: num(p.ownerFollowersCount ?? p.owner?.followersCount),
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    }));
}

async function latestTikTok(handle: string, token: string): Promise<Found[]> {
  const rows = (await apify(
    "clockworks~free-tiktok-scraper",
    { profiles: [handle], resultsPerPage: 40, shouldDownloadVideos: false },
    token,
  )) as Array<Record<string, any>>;
  return rows
    .filter((p) => p.webVideoUrl)
    .map((p) => ({
      platform: "tiktok" as const,
      post_url: p.webVideoUrl,
      posted_at: p.createTimeISO ?? null,
      caption: p.text ?? null,
      thumbnail_url: p.videoMeta?.coverUrl ?? null,
      views: num(p.playCount),
      likes: num(p.diggCount),
      comments: num(p.commentCount),
      shares: num(p.shareCount),
      saves: num(p.collectCount),
      followers: num(p.authorMeta?.fans),
      hashtags: (p.hashtags ?? []).map((h: any) => h?.name ?? "").filter(Boolean),
    }));
}

export type DiscoveryResult = {
  added: number;
  checked: number;
  skipped_no_handle: number;
  errors: string[];
};

/** Checks every creator in one report and inserts posts not seen before. */
export async function discoverReportPosts(admin: Admin, reportId: string): Promise<DiscoveryResult> {
  const token = process.env.APIFY_API_TOKEN;
  const result: DiscoveryResult = { added: 0, checked: 0, skipped_no_handle: 0, errors: [] };
  if (!token) {
    result.errors.push("Social data service key missing");
    return result;
  }

  // Single-flight lease so two runs never overlap on the same report.
  const now = new Date();
  const { data: leased } = await admin
    .from("campaign_reports")
    .update({ auto_pull_lease_until: new Date(now.getTime() + 10 * 60_000).toISOString() } as never)
    .eq("id", reportId)
    .or(`auto_pull_lease_until.is.null,auto_pull_lease_until.lt.${now.toISOString()}`)
    .select("id, auto_pull_start, auto_pull_end");
  const rep = (leased as Array<{ auto_pull_start: string | null; auto_pull_end: string | null }> | null)?.[0];
  if (!rep) {
    result.errors.push("Already checking — try again in a few minutes");
    return result;
  }

  try {
    const start = rep.auto_pull_start ? new Date(`${rep.auto_pull_start}T00:00:00Z`).getTime() - 86_400_000 : 0;
    const end = rep.auto_pull_end ? new Date(`${rep.auto_pull_end}T23:59:59Z`).getTime() + 86_400_000 : Infinity;

    const { data: creators } = await admin
      .from("campaign_report_creators")
      .select("id, name, handle")
      .eq("report_id", reportId);
    const ids = (creators ?? []).map((c) => c.id);
    const { data: posts } = ids.length
      ? await admin.from("campaign_report_posts").select("creator_id, platform, post_url, position").in("creator_id", ids)
      : { data: [] as any[] };
    const { data: dismissed } = await admin
      .from("campaign_report_dismissed_posts")
      .select("post_key")
      .eq("report_id", reportId);
    const known = new Set<string>();
    for (const p of posts ?? []) { const k = postKey(p.post_url); if (k) known.add(k); }
    for (const d of dismissed ?? []) known.add(d.post_key);

    for (const c of (creators ?? []).slice(0, 25)) {
      const rawHandle = (c.handle ?? "").trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
      const handle = (rawHandle.includes("/") ? rawHandle.split("/").pop() ?? "" : rawHandle).replace(/^@/, "");
      if (!handle) { result.skipped_no_handle++; continue; }
      const mine = (posts ?? []).filter((p) => p.creator_id === c.id);
      const platforms = new Set(mine.map((p) => p.platform).filter((p) => p === "instagram" || p === "tiktok"));
      if (!platforms.size) { platforms.add("instagram"); platforms.add("tiktok"); }

      let minPos = mine.length ? Math.min(...mine.map((p) => p.position ?? 0)) : 0;
      for (const platform of platforms) {
        result.checked++;
        let found: Found[] = [];
        try {
          found = platform === "instagram" ? await latestInstagram(handle, token) : await latestTikTok(handle, token);
        } catch (e) {
          result.errors.push(`${c.name} ${platform}: ${(e as Error).message}`);
          continue;
        }
        const fresh = found.filter((f) => {
          const k = postKey(f.post_url);
          if (!k || known.has(k)) return false;
          const t = f.posted_at ? new Date(f.posted_at).getTime() : NaN;
          return Number.isFinite(t) && t >= start && t <= end;
        });
        for (const f of fresh) {
          const thumb = f.thumbnail_url
            ? (await mirrorExternalImage(f.thumbnail_url, platform === "instagram" ? "ig-post" : "tt-post")) ?? f.thumbnail_url
            : null;
          minPos -= 1;
          const { error } = await admin.from("campaign_report_posts").insert({
            creator_id: c.id,
            platform: f.platform,
            post_url: f.post_url,
            posted_at: f.posted_at,
            caption: f.caption,
            thumbnail_url: thumb,
            views: f.views,
            likes: f.likes,
            comments: f.comments,
            shares: f.shares,
            saves: f.saves,
            followers: f.followers,
            hashtags: f.hashtags,
            metrics_updated_at: new Date().toISOString(),
            position: minPos,
            auto_added: true,
          } as never);
          if (error) result.errors.push(`${c.name}: ${error.message}`);
          else { result.added++; known.add(postKey(f.post_url)!); }
        }
      }
    }
  } finally {
    await admin
      .from("campaign_reports")
      .update({
        auto_pull_lease_until: null,
        auto_pull_last_run: new Date().toISOString(),
        auto_pull_last_result: result,
      } as never)
      .eq("id", reportId);
  }
  return result;
}
