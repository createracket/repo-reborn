import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractYouTubeId, detectPlatform } from "./youtube-utils";
import { mirrorExternalImage } from "./mirror-image.server";

async function mirrorOrKeep(url: string | null | undefined, folder: string) {
  if (!url) return null;
  return (await mirrorExternalImage(url, folder)) ?? url;
}

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
        channelId?: string;
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

  // Fetch channel subscriber count for follower estimate
  let followers: number | null = null;
  if (sn.channelId) {
    try {
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${sn.channelId}&key=${key}`,
      );
      if (chRes.ok) {
        const chJson = (await chRes.json()) as {
          items?: Array<{ statistics?: { subscriberCount?: string } }>;
        };
        const sc = chJson.items?.[0]?.statistics?.subscriberCount;
        if (sc) followers = Number(sc);
      }
    } catch {
      // ignore; leave followers null
    }
  }

  return {
    ok: true,
    platform: "youtube",
    metrics: {
      views: s.viewCount ? Number(s.viewCount) : null,
      likes: s.likeCount ? Number(s.likeCount) : null,
      comments: s.commentCount ? Number(s.commentCount) : null,
      followers,
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
      ownerFollowersCount?: number;
      owner?: { followersCount?: number; edge_followed_by?: { count?: number } };
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No Instagram post returned." };
    const followers =
      p.ownerFollowersCount ??
      p.owner?.followersCount ??
      p.owner?.edge_followed_by?.count ??
      null;
    return {
      ok: true,
      platform: "instagram",
      metrics: {
        views: p.videoPlayCount ?? p.videoViewCount ?? null,
        likes: p.likesCount ?? null,
        comments: p.commentsCount ?? null,
        followers,
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
      authorMeta?: { fans?: number };
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
        followers: p.authorMeta?.fans ?? null,
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

// ============================================================
// Profile-level scraping (for roster / profile pages)
// ============================================================

type ProfileResult =
  | {
      ok: true;
      platform: "instagram" | "tiktok" | "youtube";
      followers: number | null;
      avatar_url?: string | null;
      handle?: string | null;
    }
  | { ok: false; error: string };

function detectProfilePlatform(url: string): "instagram" | "tiktok" | "youtube" | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host === "youtu.be" || host.includes("youtube.com")) return "youtube";
    return null;
  } catch {
    return null;
  }
}

function extractInstagramHandle(url: string): string | null {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    if (!seg.length) return null;
    if (["p", "reel", "reels", "tv", "explore", "stories"].includes(seg[0])) return null;
    return seg[0].replace(/^@/, "");
  } catch {
    return url.replace(/^@/, "").trim() || null;
  }
}

function extractTikTokHandle(url: string): string | null {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    const first = seg[0] ?? "";
    if (first.startsWith("@")) return first.slice(1);
    return null;
  } catch {
    const t = url.trim().replace(/^@/, "");
    return t || null;
  }
}

async function scrapeInstagramProfile(url: string): Promise<ProfileResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN not configured." };
  const handle = extractInstagramHandle(url);
  if (!handle) return { ok: false, error: "Couldn't parse Instagram username from URL." };
  try {
    const results = (await runApifyActor(
      "apify~instagram-profile-scraper",
      { usernames: [handle] },
      token,
    )) as Array<{
      followersCount?: number;
      followers?: number;
      profilePicUrlHD?: string;
      profilePicUrl?: string;
      username?: string;
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No Instagram profile returned." };
    return {
      ok: true,
      platform: "instagram",
      followers: p.followersCount ?? p.followers ?? null,
      avatar_url: await mirrorOrKeep(p.profilePicUrlHD ?? p.profilePicUrl ?? null, "ig"),
      handle: p.username ?? handle,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function scrapeTikTokProfile(url: string): Promise<ProfileResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN not configured." };
  const handle = extractTikTokHandle(url);
  if (!handle) return { ok: false, error: "Couldn't parse TikTok handle from URL." };
  try {
    const results = (await runApifyActor(
      "clockworks~tiktok-profile-scraper",
      { profiles: [handle], resultsPerPage: 1, shouldDownloadVideos: false },
      token,
    )) as Array<{
      authorMeta?: { fans?: number; avatar?: string; name?: string };
      fans?: number;
      followerCount?: number;
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No TikTok profile returned." };
    return {
      ok: true,
      platform: "tiktok",
      followers: p.authorMeta?.fans ?? p.fans ?? p.followerCount ?? null,
      avatar_url: await mirrorOrKeep(p.authorMeta?.avatar ?? null, "tt"),
      handle: p.authorMeta?.name ?? handle,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function scrapeYouTubeChannel(url: string): Promise<ProfileResult> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_API_KEY not configured." };
  let param: string | null = null;
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg[0]?.startsWith("@")) param = `forHandle=${encodeURIComponent(seg[0])}`;
    else if (seg[0] === "channel" && seg[1]) param = `id=${encodeURIComponent(seg[1])}`;
    else if (seg[0] === "user" && seg[1]) param = `forUsername=${encodeURIComponent(seg[1])}`;
    else if (seg[0] === "c" && seg[1]) param = `forHandle=@${encodeURIComponent(seg[1])}`;
    else if (seg[0]) param = `forHandle=@${encodeURIComponent(seg[0].replace(/^@/, ""))}`;
  } catch {
    return { ok: false, error: "Invalid YouTube URL." };
  }
  if (!param) return { ok: false, error: "Couldn't parse YouTube channel from URL." };
  const api = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${param}&key=${key}`;
  const res = await fetch(api);
  if (!res.ok) return { ok: false, error: `YouTube API error ${res.status}` };
  const json = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        thumbnails?: { high?: { url?: string }; default?: { url?: string } };
      };
      statistics?: { subscriberCount?: string };
    }>;
  };
  const item = json.items?.[0];
  if (!item) return { ok: false, error: "Channel not found." };
  const sub = item.statistics?.subscriberCount;
  return {
    ok: true,
    platform: "youtube",
    followers: sub ? Number(sub) : null,
    avatar_url: await mirrorOrKeep(
      item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
      "yt",
    ),
    handle: item.snippet?.title ?? null,
  };
}

/**
 * Scrape follower count (and avatar) for a single profile URL.
 * Auth-gated. Used by roster + profile pages.
 */
export const scrapeProfileFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<ProfileResult> => {
    const platform = detectProfilePlatform(data.url);
    if (!platform)
      return { ok: false, error: "Unrecognised URL — must be Instagram, TikTok, or YouTube." };
    if (platform === "instagram") return scrapeInstagramProfile(data.url);
    if (platform === "tiktok") return scrapeTikTokProfile(data.url);
    return scrapeYouTubeChannel(data.url);
  });

// ============================================================
// Spotify artist scraping
// ============================================================

type SpotifyArtistResult =
  | {
      ok: true;
      artist_id: string;
      name?: string | null;
      followers: number | null;
      monthly_listeners: number | null;
      total_streams: number | null;
      avatar_url?: string | null;
    }
  | { ok: false; error: string };

function extractSpotifyArtistId(url: string): string | null {
  const raw = url.trim();
  // Bare 22-char base62 id
  if (/^[A-Za-z0-9]{22}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const seg = u.pathname.split("/").filter(Boolean);
    const i = seg.indexOf("artist");
    if (i >= 0 && seg[i + 1]) return seg[i + 1].split("?")[0];
    return null;
  } catch {
    return null;
  }
}

async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ?? null;
}

async function fetchMonthlyListeners(artistId: string): Promise<number | null> {
  // Scrape the public artist page — Spotify inlines monthly listeners in HTML.
  try {
    const res = await fetch(`https://open.spotify.com/artist/${artistId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try meta description first: "Artist · 1,234,567 monthly listeners."
    const m1 = html.match(/([\d,\.]+)\s+monthly listeners/i);
    if (m1) {
      const n = Number(m1[1].replace(/[,\.]/g, ""));
      if (Number.isFinite(n)) return n;
    }
    // Fallback: JSON-embedded "monthlyListeners":N
    const m2 = html.match(/"monthlyListeners"\s*:\s*(\d+)/);
    if (m2) return Number(m2[1]);
    return null;
  } catch {
    return null;
  }
}

async function fetchKworbTotalStreams(artistId: string): Promise<number | null> {
  // Kworb aggregates per-track streams; "Total" row on the artist page.
  try {
    const res = await fetch(`https://kworb.net/spotify/artist/${artistId}_songs.html`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RacketBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Row: <td>Total</td><td>1,234,567,890</td>...
    const m = html.match(/<td[^>]*>\s*Total\s*<\/td>\s*<td[^>]*>\s*([\d,]+)/i);
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scrape Spotify artist metrics: followers (Web API), monthly listeners
 * (open.spotify.com), and estimated total streams (Kworb).
 */
export const scrapeSpotifyArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<SpotifyArtistResult> => {
    const artistId = extractSpotifyArtistId(data.url);
    if (!artistId)
      return { ok: false, error: "Couldn't parse Spotify artist ID from URL." };

    const token = await getSpotifyToken();
    let name: string | null = null;
    let followers: number | null = null;
    let avatar_url: string | null = null;

    if (token) {
      const r = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = (await r.json()) as {
          name?: string;
          followers?: { total?: number };
          images?: Array<{ url?: string }>;
        };
        name = j.name ?? null;
        followers = j.followers?.total ?? null;
        avatar_url = j.images?.[0]?.url ?? null;
      }
    }

    const [monthly_listeners, total_streams] = await Promise.all([
      fetchMonthlyListeners(artistId),
      fetchKworbTotalStreams(artistId),
    ]);

    return {
      ok: true,
      artist_id: artistId,
      name,
      followers,
      monthly_listeners,
      total_streams,
      avatar_url: await mirrorOrKeep(avatar_url, "spotify"),
    };
  });

// ============================================================
// Apple Music artist scraping
// ============================================================

type AppleMusicArtistResult =
  | {
      ok: true;
      artist_id: string;
      name: string | null;
      followers: number | null; // Apple doesn't publish follower counts publicly
      monthly_listeners: number | null; // ditto
      avatar_url: string | null;
    }
  | { ok: false; error: string };

function extractAppleMusicArtistId(url: string): string | null {
  const raw = url.trim();
  if (/^\d{4,}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const seg = u.pathname.split("/").filter(Boolean);
    const i = seg.indexOf("artist");
    if (i >= 0 && seg[i + 2]) {
      // /{storefront}/artist/{name-slug}/{id}
      const id = seg[i + 2].split("?")[0];
      if (/^\d{4,}$/.test(id)) return id;
    }
    // Fallback: last numeric segment
    for (let k = seg.length - 1; k >= 0; k--) {
      const s = seg[k].split("?")[0];
      if (/^\d{4,}$/.test(s)) return s;
    }
    return null;
  } catch {
    return null;
  }
}

function extractAppleMusicStorefront(url: string): string {
  try {
    const u = new URL(url.trim());
    const seg = u.pathname.split("/").filter(Boolean);
    // First segment is usually the storefront code (e.g. "gb", "us")
    if (seg[0] && /^[a-z]{2}$/i.test(seg[0])) return seg[0].toLowerCase();
  } catch {
    // ignore
  }
  return "us";
}

/**
 * Scrape Apple Music artist metadata (name, artwork). Apple's public site
 * does not expose follower or monthly-listener numbers, so those are returned
 * as null; the fetched name is what we use for the mismatch check.
 */
export const scrapeAppleMusicArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<AppleMusicArtistResult> => {
    const artistId = extractAppleMusicArtistId(data.url);
    if (!artistId)
      return { ok: false, error: "Couldn't parse Apple Music artist ID from URL." };
    const storefront = extractAppleMusicStorefront(data.url);

    // iTunes Lookup API is public and returns artist name reliably.
    try {
      const r = await fetch(
        `https://itunes.apple.com/lookup?id=${artistId}&country=${storefront}&entity=musicArtist`,
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; RacketBot/1.0)" } },
      );
      let name: string | null = null;
      if (r.ok) {
        const j = (await r.json()) as {
          results?: Array<{ artistName?: string; wrapperType?: string }>;
        };
        const hit = j.results?.find((x) => x.wrapperType === "artist") ?? j.results?.[0];
        name = hit?.artistName ?? null;
      }

      // Try to pull artwork from the public artist page's og:image
      let avatar_url: string | null = null;
      try {
        const page = await fetch(
          `https://music.apple.com/${storefront}/artist/${artistId}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
            },
          },
        );
        if (page.ok) {
          const html = await page.text();
          const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
          if (m) avatar_url = m[1];
        }
      } catch {
        // best-effort; ignore
      }

      return {
        ok: true,
        artist_id: artistId,
        name,
        followers: null,
        monthly_listeners: null,
        avatar_url: await mirrorOrKeep(avatar_url, "apple"),
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to reach Apple Music.",
      };
    }
  });


