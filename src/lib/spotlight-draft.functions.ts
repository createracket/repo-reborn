import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  text: z.string().trim().min(40).max(20000),
  artistName: z.string().trim().max(200).optional(),
});

export type SpotlightDraft = {
  headline?: string;
  subtitle?: string;
  slug?: string;
  intro?: string;
  host_bio?: string;
  partnership_pitch?: string;
  eoi_opportunities?: string[];
  audience_segments?: string[];
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  contact?: string;
};

const SYSTEM = `You turn a raw artist/manager email into a polished "Spotlight" partnership page draft for a music-and-brand collaboration platform.

Return ONLY a JSON object (no prose, no markdown) with these fields:
- headline (string): the artist/act name, exactly as written in the email
- subtitle (string): a short all-caps style tagline, max 6 words
- slug (string): lowercase kebab-case version of the artist name
- intro (string): 1-2 punchy sentences introducing the act and why a brand should care
- host_bio (string): 2-4 sentences about the artist, their members, personality and shared interests, written for a brand reader
- partnership_pitch (string): 3-5 sentences covering key timings (tours, festivals, dates), what a sponsor gets, and any openness to sync or other deals
- eoi_opportunities (string[]): 4-8 short concrete partnership opportunities (e.g. "Tour sponsorship — US headline run, Nov 5 – Dec 6"), including named dream brands or categories where mentioned
- audience_segments (string[]): 3-6 short inferred audience/lifestyle groups
- instagram, tiktok, youtube, spotify (string): full URLs only if present in the text
- contact (string): email address only if present in the text

Rules:
- Never invent facts, dates, brands or links that are not in the source text.
- Omit any field you cannot support from the text.
- Keep list items short (max ~12 words each), no bullets or numbering characters.
- Write in confident, plain, non-corporate language. No emojis.`;

export const draftSpotlightFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const { assertQuota, consumeQuota } = await import("./usage.server");
    await assertQuota(context.userId, "spotlight_draft");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userContent = [
      data.artistName ? `Artist/act name: ${data.artistName}` : null,
      "Source email / info dump:",
      data.text,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate limited right now — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted — top up in workspace settings.");
      throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const list = (v: unknown) =>
      Array.isArray(v)
        ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean).slice(0, 10)
        : undefined;

    const draft: SpotlightDraft = {
      headline: str(parsed.headline),
      subtitle: str(parsed.subtitle),
      slug: str(parsed.slug)?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      intro: str(parsed.intro),
      host_bio: str(parsed.host_bio),
      partnership_pitch: str(parsed.partnership_pitch),
      eoi_opportunities: list(parsed.eoi_opportunities),
      audience_segments: list(parsed.audience_segments),
      instagram: str(parsed.instagram),
      tiktok: str(parsed.tiktok),
      youtube: str(parsed.youtube),
      spotify: str(parsed.spotify),
      contact: str(parsed.contact),
    };

    await consumeQuota(context.userId, "spotlight_draft");
    return { draft };
  });
