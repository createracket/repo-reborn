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
      thumbnail_url: await mirrorOrKeep(sn.thumbnails?.maxres?.url ?? sn.thumbnails?.high?.url ?? null, "yt-post"),
      posted_at: sn.publishedAt ?? null,
      hashtags: sn.tags ?? [],
    },
  };
}

async function runApifyActor(
  actorId: string,
  input: unknown,
  token: string,
  timeoutSecs = 180,
) {
  // Sync-get-dataset-items returns results in-process. Profile scrapers often
  // need >60s to boot the actor + fetch, so default to 180s.
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}`;
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
      ownerUsername?: string;
      owner?: { followersCount?: number; username?: string; edge_followed_by?: { count?: number } };
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No Instagram post returned." };
    let followers =
      p.ownerFollowersCount ??
      p.owner?.followersCount ??
      p.owner?.edge_followed_by?.count ??
      null;
    // The post scraper often omits follower counts — fall back to the profile
    // scraper using the post owner's handle (or the handle in the URL).
    if (followers == null) {
      const handle = p.ownerUsername ?? p.owner?.username ?? extractInstagramHandle(url);
      if (handle) {
        const prof = await scrapeInstagramProfile(`https://www.instagram.com/${handle}/`);
        if (prof.ok) followers = prof.followers;
      }
    }
    return {
      ok: true,
      platform: "instagram",
      metrics: {
        views: p.videoPlayCount ?? p.videoViewCount ?? null,
        likes: p.likesCount ?? null,
        comments: p.commentsCount ?? null,
        followers,
        caption: p.caption ?? null,
        thumbnail_url: await mirrorOrKeep(p.displayUrl ?? null, "ig-post"),
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
      authorMeta?: { fans?: number; name?: string };
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No TikTok post returned." };
    let followers = p.authorMeta?.fans ?? null;
    if (followers == null) {
      const handle = p.authorMeta?.name ?? extractTikTokHandle(url);
      if (handle) {
        const prof = await scrapeTikTokProfile(`https://www.tiktok.com/@${handle}`);
        if (prof.ok) followers = prof.followers;
      }
    }
    return {
      ok: true,
      platform: "tiktok",
      metrics: {
        views: p.playCount ?? null,
        likes: p.diggCount ?? null,
        comments: p.commentCount ?? null,
        shares: p.shareCount ?? null,
        saves: p.collectCount ?? null,
        followers,

        caption: p.text ?? null,
        thumbnail_url: await mirrorOrKeep(p.videoMeta?.coverUrl ?? null, "tt-post"),
        posted_at: p.createTimeISO ?? null,
        hashtags: (p.hashtags ?? []).map((h) => h.name ?? "").filter(Boolean),
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Social platforms return -1 (or other negatives) when a count is hidden —
 * e.g. Instagram posts with like counts turned off. Treat those as unknown.
 */
function sanitiseMetrics(result: ScrapeResult): ScrapeResult {
  if (!result.ok) return result;
  const m = { ...result.metrics };
  (["views", "likes", "comments", "shares", "saves", "followers"] as const).forEach((k) => {
    const v = m[k];
    if (typeof v === "number" && (v < 0 || !Number.isFinite(v))) m[k] = null;
  });
  return { ...result, metrics: m };
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
    if (platform === "youtube") return sanitiseMetrics(await scrapeYouTube(data.url));
    if (platform === "instagram") return sanitiseMetrics(await scrapeInstagram(data.url));
    return sanitiseMetrics(await scrapeTikTok(data.url));
  });

// ============================================================
// Profile-level scraping (for roster / profile pages)
// ============================================================

type ProfileResult =
  | {
      ok: true;
      platform: "instagram" | "tiktok" | "youtube" | "twitch" | "facebook" | "x";
      followers: number | null;
      avatar_url?: string | null;
      handle?: string | null;
    }
  | { ok: false; error: string };

function detectProfilePlatform(
  url: string,
): "instagram" | "tiktok" | "youtube" | "twitch" | "facebook" | "x" | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host === "youtu.be" || host.includes("youtube.com")) return "youtube";
    if (host.includes("twitch.tv")) return "twitch";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
    if (host === "x.com" || host.includes("twitter.com")) return "x";
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
  const clean = (h: string) => {
    const v = h.trim().replace(/^@/, "").split(/[?#/]/)[0];
    return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
  };
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    for (const s of seg) {
      if (s.startsWith("@")) return clean(s);
    }
    // Paths like /handle or /handle/video/123 (no @ prefix)
    const first = seg[0] ?? "";
    if (first && !["t", "v", "video", "embed", "tag", "music", "discover", "foryou", "explore"].includes(first)) {
      return clean(first);
    }
    return null;
  } catch {
    return clean(url);
  }
}

/** Short share links (vm.tiktok.com/…, tiktok.com/t/…) redirect to the real URL. */
async function resolveTikTokShortLink(url: string): Promise<string> {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const isShort =
      host === "vm.tiktok.com" || host === "vt.tiktok.com" || u.pathname.startsWith("/t/");
    if (!isShort) return url;
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

/**
 * Accepts a full URL, a bare handle, an @handle, or a scheme-less link and
 * returns a canonical profile URL so platform detection never fails on input
 * shape alone.
 */
export function normaliseProfileInput(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value)) return `https://${value}`;
  return value;
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

type TikTokProfileItem = {
  authorMeta?: { fans?: number; avatar?: string; name?: string };
  fans?: number;
  followerCount?: number;
  stats?: { followerCount?: number };
};

function pickTikTokProfile(results: unknown[], handle: string): ProfileResult | null {
  for (const raw of results as TikTokProfileItem[]) {
    if (!raw) continue;
    const followers =
      raw.authorMeta?.fans ?? raw.fans ?? raw.followerCount ?? raw.stats?.followerCount ?? null;
    if (followers == null && !raw.authorMeta) continue;
    return {
      ok: true,
      platform: "tiktok",
      followers,
      avatar_url: raw.authorMeta?.avatar ?? null,
      handle: raw.authorMeta?.name ?? handle,
    };
  }
  return null;
}

async function scrapeTikTokProfile(url: string): Promise<ProfileResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN not configured." };
  const resolved = await resolveTikTokShortLink(normaliseProfileInput(url));
  const handle = extractTikTokHandle(resolved);
  if (!handle) return { ok: false, error: "Couldn't parse TikTok handle from URL." };
  try {
    let found = pickTikTokProfile(
      await runApifyActor(
        "clockworks~tiktok-profile-scraper",
        { profiles: [handle], resultsPerPage: 1, shouldDownloadVideos: false },
        token,
      ),
      handle,
    );

    // Fallback: the free scraper also returns authorMeta for a profile URL.
    if (!found) {
      found = pickTikTokProfile(
        await runApifyActor(
          "clockworks~free-tiktok-scraper",
          {
            profiles: [handle],
            resultsPerPage: 1,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
          },
          token,
        ),
        handle,
      );
    }

    if (!found) return { ok: false, error: `No TikTok profile found for @${handle}.` };
    if (found.ok && found.avatar_url) {
      found = { ...found, avatar_url: await mirrorOrKeep(found.avatar_url, "tt") };
    }
    return found;
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

function firstPathSegment(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const seg = u.pathname.split("/").filter(Boolean);
    return seg[0] ? seg[0].replace(/^@/, "") : null;
  } catch {
    return url.trim().replace(/^@/, "") || null;
  }
}

async function scrapeTwitchChannel(url: string): Promise<ProfileResult> {
  const login = firstPathSegment(url);
  if (!login) return { ok: false, error: "Couldn't parse Twitch channel from URL." };
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twitchKey = process.env.TWITCH_API_KEY;
  if (!lovableKey || !twitchKey)
    return { ok: false, error: "Twitch isn't connected yet — connect Twitch to enable follower fetch." };
  try {
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twitchKey,
    };
    const userRes = await fetch(
      `https://connector-gateway.lovable.dev/twitch/users?login=${encodeURIComponent(login)}`,
      { headers },
    );
    if (!userRes.ok) {
      const body = await userRes.text();
      return { ok: false, error: `Twitch error ${userRes.status}: ${body.slice(0, 150)}` };
    }
    const uj = (await userRes.json()) as {
      data?: Array<{ id?: string; display_name?: string; profile_image_url?: string }>;
    };
    const user = uj.data?.[0];
    if (!user?.id) return { ok: false, error: "Twitch channel not found." };
    let followers: number | null = null;
    const fRes = await fetch(
      `https://connector-gateway.lovable.dev/twitch/channels/followers?broadcaster_id=${user.id}&first=1`,
      { headers },
    );
    if (fRes.ok) {
      const fj = (await fRes.json()) as { total?: number };
      followers = typeof fj.total === "number" ? fj.total : null;
    }
    return {
      ok: true,
      platform: "twitch",
      followers,
      avatar_url: await mirrorOrKeep(user.profile_image_url ?? null, "twitch"),
      handle: user.display_name ?? login,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function scrapeFacebookPage(url: string): Promise<ProfileResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN not configured." };
  try {
    const results = (await runApifyActor(
      "apify~facebook-pages-scraper",
      { startUrls: [{ url: url.startsWith("http") ? url : `https://${url}` }] },
      token,
    )) as Array<{
      followers?: number;
      followersCount?: number;
      likes?: number;
      title?: string;
      pageName?: string;
      profilePictureUrl?: string;
      profilePhoto?: string;
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No Facebook page returned." };
    return {
      ok: true,
      platform: "facebook",
      followers: p.followers ?? p.followersCount ?? p.likes ?? null,
      avatar_url: await mirrorOrKeep(p.profilePictureUrl ?? p.profilePhoto ?? null, "fb"),
      handle: p.title ?? p.pageName ?? null,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function scrapeXProfile(url: string): Promise<ProfileResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN not configured." };
  const handle = firstPathSegment(url);
  if (!handle) return { ok: false, error: "Couldn't parse X handle from URL." };
  try {
    const results = (await runApifyActor(
      "apidojo~twitter-user-scraper",
      { twitterHandles: [handle], maxItems: 1, getFollowers: false, getFollowing: false },
      token,
    )) as Array<{
      followers?: number;
      followersCount?: number;
      userName?: string;
      screen_name?: string;
      name?: string;
      profilePicture?: string;
      profile_image_url_https?: string;
    }>;
    const p = results[0];
    if (!p) return { ok: false, error: "No X profile returned." };
    return {
      ok: true,
      platform: "x",
      followers: p.followers ?? p.followersCount ?? null,
      avatar_url: await mirrorOrKeep(p.profilePicture ?? p.profile_image_url_https ?? null, "x"),
      handle: p.userName ?? p.screen_name ?? handle,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Scrape follower count (and avatar) for a single profile URL.
 * Auth-gated. Used by roster + profile pages.
 */
export const scrapeProfileFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<ProfileResult> => {
    const url = normaliseProfileInput(data.url);
    const platform = detectProfilePlatform(url);
    if (!platform)
      return {
        ok: false,
        error: "Unrecognised URL — must be Instagram, TikTok, YouTube, Twitch, Facebook or X.",
      };
    if (platform === "instagram") return scrapeInstagramProfile(url);
    if (platform === "tiktok") return scrapeTikTokProfile(url);
    if (platform === "twitch") return scrapeTwitchChannel(url);
    if (platform === "facebook") return scrapeFacebookPage(url);
    if (platform === "x") return scrapeXProfile(url);
    return scrapeYouTubeChannel(url);

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
      genres?: string[];
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
    const m1 = html.match(/([\d,\.]+)\s+monthly listeners/i);
    if (m1) {
      const n = Number(m1[1].replace(/[,\.]/g, ""));
      if (Number.isFinite(n)) return n;
    }
    const m2 = html.match(/"monthlyListeners"\s*:\s*(\d+)/);
    if (m2) return Number(m2[1]);
    return null;
  } catch {
    return null;
  }
}

/**
 * Reliable fallback for Spotify artist metrics via Apify. Spotify frequently
 * gates its public page against server-side scrapers, so this actor picks up
 * the slack for monthly listeners / followers / name / avatar.
 */
async function fetchSpotifyViaApify(artistId: string): Promise<{
  name?: string | null;
  followers?: number | null;
  monthly_listeners?: number | null;
  avatar_url?: string | null;
} | null> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/automation-lab~spotify-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [`https://open.spotify.com/artist/${artistId}`],
        }),
      },
    );
    if (!res.ok) return null;
    const items = (await res.json()) as Array<{
      type?: string;
      name?: string;
      monthlyListeners?: number;
      followers?: number;
      imageUrl?: string;
    }>;
    const a = items.find((i) => i.type === "artist") ?? items[0];
    if (!a) return null;
    return {
      name: a.name ?? null,
      followers: typeof a.followers === "number" ? a.followers : null,
      monthly_listeners:
        typeof a.monthlyListeners === "number" ? a.monthlyListeners : null,
      avatar_url: a.imageUrl ?? null,
    };
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
export async function spotifyArtistCore(data: { url: string }): Promise<SpotifyArtistResult> {
  {
    const artistId = extractSpotifyArtistId(data.url);
    if (!artistId)
      return { ok: false, error: "Couldn't parse Spotify artist ID from URL." };

    const token = await getSpotifyToken();
    let name: string | null = null;
    let followers: number | null = null;
    let avatar_url: string | null = null;
    let genres: string[] = [];

    if (token) {
      const r = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = (await r.json()) as {
          name?: string;
          followers?: { total?: number };
          images?: Array<{ url?: string }>;
          genres?: string[];
        };
        name = j.name ?? null;
        followers = j.followers?.total ?? null;
        avatar_url = j.images?.[0]?.url ?? null;
        genres = Array.isArray(j.genres) ? j.genres.slice(0, 6) : [];
      }
    }

    let [monthly_listeners, total_streams] = await Promise.all([
      fetchMonthlyListeners(artistId),
      fetchKworbTotalStreams(artistId),
    ]);

    // Spotify's public page often blocks server-side scrapers; if the Web API
    // and direct scrape didn't fill everything, hit the Apify actor as a
    // reliable fallback.
    if (monthly_listeners == null || followers == null || !name || !avatar_url) {
      const apify = await fetchSpotifyViaApify(artistId);
      if (apify) {
        if (monthly_listeners == null) monthly_listeners = apify.monthly_listeners ?? null;
        if (followers == null) followers = apify.followers ?? null;
        if (!name) name = apify.name ?? null;
        if (!avatar_url) avatar_url = apify.avatar_url ?? null;
      }
    }

    return {
      ok: true,
      artist_id: artistId,
      name,
      followers,
      monthly_listeners,
      total_streams,
      genres,
      avatar_url: await mirrorOrKeep(avatar_url, "spotify"),
    };
  }
}

export const scrapeSpotifyArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<SpotifyArtistResult> => spotifyArtistCore(data));

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
async function appleMusicArtistCore(data: { url: string }): Promise<AppleMusicArtistResult> {
  {
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
  }
}

export const scrapeAppleMusicArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1) }).parse)
  .handler(async ({ data }): Promise<AppleMusicArtistResult> => appleMusicArtistCore(data));

// ============================================================
// Metered member profile sync (1 run / month for non-admins)
// ============================================================

const profileSyncInput = z.object({
  instagram_url: z.string().nullish(),
  tiktok_url: z.string().nullish(),
  youtube_url: z.string().nullish(),
  twitch_url: z.string().nullish(),
  facebook_url: z.string().nullish(),
  x_url: z.string().nullish(),
  spotify_url: z.string().nullish(),
  apple_music_url: z.string().nullish(),
  // Secondary links (band / podcast / side project) synced in the same run.
  extra_urls: z.array(z.string()).max(24).optional(),
});

export type ProfileSyncResult = {
  ok: boolean;
  error?: string;
  remaining?: number;
  resets?: string;
  instagram?: ProfileResult | null;
  tiktok?: ProfileResult | null;
  youtube?: ProfileResult | null;
  twitch?: ProfileResult | null;
  facebook?: ProfileResult | null;
  x?: ProfileResult | null;
  spotify?: SpotifyArtistResult | null;
  apple?: AppleMusicArtistResult | null;
  extras?: Array<{ url: string; followers: number | null; streams: number | null }>;
};


export async function scrapeProfileByUrl(raw: string): Promise<ProfileResult> {
  const url = normaliseProfileInput(raw);
  const platform = detectProfilePlatform(url);
  if (platform === "instagram") return scrapeInstagramProfile(url);
  if (platform === "tiktok") return scrapeTikTokProfile(url);
  if (platform === "youtube") return scrapeYouTubeChannel(url);
  if (platform === "twitch") return scrapeTwitchChannel(url);
  if (platform === "facebook") return scrapeFacebookPage(url);
  if (platform === "x") return scrapeXProfile(url);
  return { ok: false, error: "Unsupported profile URL." };
}

/**
 * Runs every connected platform in one metered call so a member spends at most
 * one monthly sync allowance per refresh. Admins are exempt.
 */
export const runProfileSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSyncInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<ProfileSyncResult> => {
    const { assertQuota, consumeQuota, getQuota, QuotaError } = await import("./usage.server");
    try {
      await assertQuota(context.userId, "profile_sync");
    } catch (e) {
      if (e instanceof QuotaError) {
        const q = await getQuota(context.userId, "profile_sync");
        return { ok: false, error: e.message, remaining: 0, resets: q.resets };
      }
      throw e;
    }

    const [instagram, tiktok, youtube, twitch, facebook, x, spotify, apple] = await Promise.all([
      data.instagram_url ? scrapeProfileByUrl(data.instagram_url) : Promise.resolve(null),
      data.tiktok_url ? scrapeProfileByUrl(data.tiktok_url) : Promise.resolve(null),
      data.youtube_url ? scrapeProfileByUrl(data.youtube_url) : Promise.resolve(null),
      data.twitch_url ? scrapeProfileByUrl(data.twitch_url) : Promise.resolve(null),
      data.facebook_url ? scrapeProfileByUrl(data.facebook_url) : Promise.resolve(null),
      data.x_url ? scrapeProfileByUrl(data.x_url) : Promise.resolve(null),
      data.spotify_url ? spotifyArtistCore({ url: data.spotify_url }) : Promise.resolve(null),
      data.apple_music_url ? appleMusicArtistCore({ url: data.apple_music_url }) : Promise.resolve(null),
    ]);

    await consumeQuota(context.userId, "profile_sync");
    const q = await getQuota(context.userId, "profile_sync");
    return {
      ok: true,
      remaining: q.admin ? -1 : q.remaining,
      resets: q.resets,
      instagram,
      tiktok,
      youtube,
      twitch,
      facebook,
      x,
      spotify,
      apple,
    };
  });



