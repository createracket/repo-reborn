import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractYouTubeId, detectPlatform } from "./youtube-utils";

type ScrapedMetrics = {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  followers?: number | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  posted_at?: string | null;
  hashtags?: string[];
};

type ScrapeResult =
  | { ok: true; platform: "instagram" | "tiktok" | "youtube"; metrics: ScrapedMetrics }
  | { ok: false; error: string };

async function scrapeYouTube(url: string): Promise<ScrapeResult> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key)
    return {
      ok: false,
      error: "GOOGLE_API_KEY not configured. Add it to enable YouTube auto-fetch.",
    };
  const id = extractYouTubeId(url);
  if (!id) return { ok: false, error: "Couldn't parse YouTube video ID from URL." };
  const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${id}&key=${key}`;
  const res = await fetch(api);
  if (!res.ok) return { ok: false, error: `YouTube API error ${res.status}` };
  const json = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: { high?: { url?: string }; maxres?: { url?: string } };
        tags?: string[];
      };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }>;
  };
  const item = json.items?.[0];
  if (!item) return { ok: false, error: "Video not found or is private." };
  const s = item.statistics ?? {};
  const sn = item.snippet ?? {};
  return {
    ok: true,
    platform: "youtube",
    metrics: {
      views: s.viewCount ? Number(s.viewCount) : null,
      likes: s.likeCount ? Number(s.likeCount) : null,
      comments: s.commentCount ? Number(s.commentCount) : null,
      caption: sn.description ?? sn.title ?? null,
      thumbnail_url: sn.thumbnails?.maxres?.url ?? sn.thumbnails?.high?.url ?? null,
      posted_at: sn.publishedAt ?? null,
      hashtags: sn.tags ?? [],
    },
  };
}

async function runApifyActor(actorId: string, input: unknown, token: string) {
  // Sync-get-dataset-items returns results in-process (single URL, ~10-30s).
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=60`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify ${actorId} error ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as unknown[];
}

async function scrapeInstagram(url: string): Promise<ScrapeResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token)
    return {
      ok: false,
      error: "APIFY_API_TOKEN not configured. Add it to enable Instagram auto-fetch.",
    };
  try {
    const results = (await runApifyActor(
      "apify~instagram-post-scraper",
      { username: [url], resultsLimit: 1, addParentData: false },
      token,
    )) as Array<{
      videoViewCount?: number;
      videoPlayCount?: number;
      likesCount?: number;
      commentsCount?: number;
      caption?: string;
      displayUrl?: string;
      timestamp?: string;
      hashtags?: string[];
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No Instagram post returned." };
    return {
      ok: true,
      platform: "instagram",
      metrics: {
        views: p.videoPlayCount ?? p.videoViewCount ?? null,
        likes: p.likesCount ?? null,
        comments: p.commentsCount ?? null,
        caption: p.caption ?? null,
        thumbnail_url: p.displayUrl ?? null,
        posted_at: p.timestamp ?? null,
        hashtags: p.hashtags ?? [],
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function scrapeTikTok(url: string): Promise<ScrapeResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token)
    return {
      ok: false,
      error: "APIFY_API_TOKEN not configured. Add it to enable TikTok auto-fetch.",
    };
  try {
    const results = (await runApifyActor(
      "clockworks~free-tiktok-scraper",
      { postURLs: [url], resultsPerPage: 1, shouldDownloadVideos: false },
      token,
    )) as Array<{
      playCount?: number;
      diggCount?: number;
      commentCount?: number;
      shareCount?: number;
      collectCount?: number;
      text?: string;
      videoMeta?: { coverUrl?: string };
      createTimeISO?: string;
      hashtags?: Array<{ name?: string }>;
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No TikTok post returned." };
    return {
      ok: true,
      platform: "tiktok",
      metrics: {
        views: p.playCount ?? null,
        likes: p.diggCount ?? null,
        comments: p.commentCount ?? null,
        shares: p.shareCount ?? null,
        saves: p.collectCount ?? null,
        caption: p.text ?? null,
        thumbnail_url: p.videoMeta?.coverUrl ?? null,
        posted_at: p.createTimeISO ?? null,
        hashtags: (p.hashtags ?? []).map((h) => h.name ?? "").filter(Boolean),
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Scrape metrics for a single post URL. Auth-gated. Returns raw metrics —
 * caller decides whether to write them to the DB.
 */
export const scrapePostMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().url() }).parse)
  .handler(async ({ data }): Promise<ScrapeResult> => {
    const platform = detectPlatform(data.url);
    if (!platform)
      return { ok: false, error: "Unrecognised URL — must be Instagram, TikTok, or YouTube." };
    if (platform === "youtube") return scrapeYouTube(data.url);
    if (platform === "instagram") return scrapeInstagram(data.url);
    return scrapeTikTok(data.url);
  });
