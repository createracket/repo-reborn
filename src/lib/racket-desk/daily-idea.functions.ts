import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  profiles: z
    .array(
      z.object({
        platform: z.enum(["TikTok", "Instagram", "YouTube"]),
        handle: z.string().trim().min(1).max(80),
        regions: z.array(z.enum(["UK", "US", "AU"])).min(1),
      }),
    )
    .min(1)
    .max(20),
  trendSummary: z.string().max(4000).optional(),
});

export interface DailyIdeaResult {
  hook: string;
  format: string;
  structure: string[];
  audio: string;
  cta: string;
  matchedTrend?: string;
}

export const generateDailyIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ context, data }): Promise<DailyIdeaResult> => {
    const { supabase, userId } = context;
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Admin access required");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const today = new Date().toISOString().slice(0, 10);
    const profileLines = data.profiles
      .map((p) => `- ${p.platform} @${p.handle} (regions: ${p.regions.join(", ")})`)
      .join("\n");

    const system = `You are Racket, a creative strategist for musicians and their marketing teams. You produce ONE actionable social content idea per day that is on-trend for music and culture across UK, US and AU. Output MUST be valid JSON matching the schema. Be specific, punchy, and shootable today. No emojis in the hook.`;

    const user = `Date: ${today}

Linked profiles:
${profileLines}

${data.trendSummary ? `Current trending formats to lean into:\n${data.trendSummary}\n` : ""}
Return one content idea tailored to these profiles' platforms and audience regions. Prioritise formats that are rising this week in music/culture.

Respond with JSON only, matching this exact shape:
{
  "hook": "one-line opening line (max 90 chars)",
  "format": "short label of the format, e.g. 'Sped-up snippet + POV'",
  "structure": ["step 1", "step 2", "step 3", "step 4"],
  "audio": "specific track / sound direction",
  "cta": "closing call to action",
  "matchedTrend": "the current trend it leans into"
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
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
      if (res.status === 429) throw new Error("Rate limit reached — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: DailyIdeaResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Model returned invalid JSON. Try again.");
    }

    return {
      hook: String(parsed.hook ?? "").slice(0, 200),
      format: String(parsed.format ?? "").slice(0, 120),
      structure: Array.isArray(parsed.structure)
        ? parsed.structure.slice(0, 6).map((s) => String(s).slice(0, 200))
        : [],
      audio: String(parsed.audio ?? "").slice(0, 200),
      cta: String(parsed.cta ?? "").slice(0, 200),
      matchedTrend: parsed.matchedTrend ? String(parsed.matchedTrend).slice(0, 200) : undefined,
    };
  });
