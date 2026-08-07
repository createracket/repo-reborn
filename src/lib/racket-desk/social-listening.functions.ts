import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RunInput = z.object({
  artistName: z.string().trim().min(1).max(120),
  handle: z.string().trim().min(1).max(80),
  limit: z.number().int().min(5).max(50).default(30),
});

export interface ScannedPost {
  url: string;
  shortCode: string | null;
  caption: string;
  thumbnail: string | null;
  views: number;
  likes: number;
  commentsCount: number;
  engagementScore: number;
}

export interface TopPost extends ScannedPost {
  sentimentScore: string;
  keySentimentDriver: string;
}

export interface ListeningAnalysis {
  topPosts: TopPost[];
  whatsWorking: string[];
  fanSignals: string[];
  futureIdeas: Array<{ title: string; why: string }>;
}

export interface ListeningResult {
  ok: boolean;
  error?: string;
  scanId?: string;
  handle?: string;
  artistName?: string;
  posts?: ScannedPost[];
  analysis?: ListeningAnalysis;
}

function cleanHandle(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("http")) {
    try {
      const u = new URL(t);
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg) return seg.replace(/^@/, "");
    } catch {
      /* fall through */
    }
  }
  return t.replace(/^@/, "");
}

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export const runSocialListening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ context, data }): Promise<ListeningResult> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const token = process.env.APIFY_API_TOKEN;
    if (!token) return { ok: false, error: "APIFY_API_TOKEN is not configured." };
    const aiKey = process.env.LOVABLE_API_KEY;
    if (!aiKey) return { ok: false, error: "AI is not configured." };

    const handle = cleanHandle(data.handle);

    let raw: any[];
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${token}&timeout=240`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: [handle], resultsLimit: data.limit }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Apify error ${res.status}: ${body.slice(0, 200)}` };
      }
      raw = (await res.json()) as any[];
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Scrape failed." };
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false, error: `No public reels found for @${handle}.` };
    }

    const posts: ScannedPost[] = raw.map((item: any) => {
      const views = Number(item.videoViewCount ?? item.videoPlayCount ?? 0) || 0;
      const likes = Number(item.likesCount ?? 0) || 0;
      const commentsCount = Number(item.commentsCount ?? 0) || 0;
      return {
        url: String(item.url ?? ""),
        shortCode: item.shortCode ?? null,
        caption: String(item.caption ?? "").slice(0, 600),
        thumbnail: item.displayUrl ?? item.thumbnailUrl ?? null,
        views,
        likes,
        commentsCount,
        engagementScore: views + likes * 2 + commentsCount * 5,
      };
    });
    posts.sort((a, b) => b.engagementScore - a.engagementScore);

    const top5 = posts.slice(0, 5).map((p, i) => ({
      index: i,
      url: p.url,
      caption: p.caption,
      views: p.views,
      likes: p.likes,
      commentsCount: p.commentsCount,
      comments: (raw.find((r: any) => r.url === p.url)?.latestComments ?? [])
        .slice(0, 15)
        .map((c: any) => String(c?.text ?? c ?? "").slice(0, 240)),
    }));

    const system =
      "You are a music talent strategist. You read social performance data and fan comments, then say what is working and what to make next. Output MUST be valid JSON only.";
    const user = `Artist: ${data.artistName} (Instagram @${handle})

Top performing reels (already ranked by engagement):
${JSON.stringify(top5)}

Pick the best 3 reels considering engagement AND comment sentiment. Then write the strategy read.

Respond with JSON only:
{
  "topPosts": [{ "index": 0, "sentimentScore": "92% positive", "keySentimentDriver": "one sentence on why fans respond" }],
  "whatsWorking": ["3-5 short bullets on the formats, hooks and framing that land"],
  "fanSignals": ["3-5 short bullets on what the comments say fans want more of"],
  "futureIdeas": [{ "title": "short idea title", "why": "one line on why it fits this artist right now" }]
}`;

    let analysis: ListeningAnalysis;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429) return { ok: false, error: "AI rate limit reached — try again shortly." };
        if (res.status === 402) return { ok: false, error: "AI credits exhausted." };
        return { ok: false, error: `AI gateway ${res.status}: ${body.slice(0, 200)}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
      const picks: any[] = Array.isArray(parsed.topPosts) ? parsed.topPosts.slice(0, 3) : [];
      analysis = {
        topPosts: picks
          .map((p: any) => {
            const base = posts[Number(p.index) || 0];
            if (!base) return null;
            return {
              ...base,
              sentimentScore: String(p.sentimentScore ?? "—").slice(0, 40),
              keySentimentDriver: String(p.keySentimentDriver ?? "").slice(0, 300),
            } as TopPost;
          })
          .filter((p): p is TopPost => !!p),
        whatsWorking: (Array.isArray(parsed.whatsWorking) ? parsed.whatsWorking : [])
          .slice(0, 6)
          .map((s: unknown) => String(s).slice(0, 300)),
        fanSignals: (Array.isArray(parsed.fanSignals) ? parsed.fanSignals : [])
          .slice(0, 6)
          .map((s: unknown) => String(s).slice(0, 300)),
        futureIdeas: (Array.isArray(parsed.futureIdeas) ? parsed.futureIdeas : [])
          .slice(0, 6)
          .map((i: any) => ({
            title: String(i?.title ?? "").slice(0, 160),
            why: String(i?.why ?? "").slice(0, 300),
          })),
      };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "AI analysis failed." };
    }

    const { data: saved } = await supabase
      .from("social_listening_scans")
      .insert({
        artist_name: data.artistName,
        platform: "Instagram",
        handle,
        posts: posts.slice(0, 30) as any,
        analysis: analysis as any,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    return {
      ok: true,
      scanId: (saved as any)?.id,
      handle,
      artistName: data.artistName,
      posts,
      analysis,
    };
  });

export const listSocialListeningScans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("social_listening_scans")
      .select("id, artist_name, handle, platform, posts, analysis, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      artist_name: string;
      handle: string;
      platform: string;
      posts: ScannedPost[];
      analysis: ListeningAnalysis;
      created_at: string;
    }>;
  });

export const deleteSocialListeningScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("social_listening_scans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
