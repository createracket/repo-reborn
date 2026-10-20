import { z } from "zod";

export function listeningEnabled(slug: string) { return slug === "chats-socials"; }
export const listeningAnalysisSchema = z.object({
  whatsWorking: z.array(z.string()).catch([]),
  fanSignals: z.array(z.string()).catch([]),
  futureIdeas: z.array(z.object({ title: z.string(), why: z.string() })).catch([]),
  topPosts: z.array(z.object({
    url: z.string().url().refine((url) => /^https?:\/\//i.test(url)),
    caption: z.string().catch(""), keySentimentDriver: z.string().catch(""),
    views: z.number().catch(0), likes: z.number().catch(0), commentsCount: z.number().catch(0),
  })).catch([]),
});
export type CampaignListeningReport = {
  id: string; artist_name: string; handle: string; platform: string;
  report_title: string | null; created_at: string;
  analysis: z.infer<typeof listeningAnalysisSchema>;
};