import { z } from "zod";

export function listeningEnabled(slug: string) { return slug === "chats-socials" || slug === "stat-socials"; }
export const listeningDisclaimerSchema = z.string().trim();
export function isListeningContentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "instagram.com") return /^\/(p|reel|reels|tv)\/[^/]+\/?$/.test(url.pathname);
    if (host === "tiktok.com") return /^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname);
    if (host === "youtube.com" || host === "m.youtube.com") return (url.pathname === "/watch" && !!url.searchParams.get("v")) || /^\/(shorts|live)\/[^/]+\/?$/.test(url.pathname);
    if (host === "youtu.be") return /^\/[^/]+\/?$/.test(url.pathname);
    return false;
  } catch { return false; }
}
export const listeningAnalysisSchema = z.object({
  whatsWorking: z.array(z.string()).catch([]),
  fanSignals: z.array(z.string()).catch([]),
  futureIdeas: z.array(z.object({ title: z.string(), why: z.string() })).catch([]),
  topPosts: z.array(z.object({
    url: z.string().url().refine((url) => /^https?:\/\//i.test(url)),
    caption: z.string().catch(""), keySentimentDriver: z.string().catch(""),
    views: z.number().catch(0), likes: z.number().catch(0), commentsCount: z.number().catch(0),
  })).catch([]).transform((posts) => posts.filter((post) => isListeningContentUrl(post.url))),
});
export type CampaignListeningReport = {
  id: string; artist_name: string; handle: string; platform: string;
  report_title: string | null; created_at: string;
  analysis: z.infer<typeof listeningAnalysisSchema>;
};