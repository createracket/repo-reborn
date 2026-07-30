import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MUSICIAN_FIELDS = `
- name (string): artist name
- artistType (string[]): subset of ["Solo artist","In a band","Both","DJ","Producer","Songwriter","Composer","Session musician"]
- recordContract (string): one of ["Yes","No","Currently in negotiations"]
- recordLabel (string): label name, only if recordContract is "Yes"
- interests (string[]): subset of ["Automotive","Arts & Culture","Books/Reading","Business/Finance","DIY/Home Improvements","Fashion (designer, luxury)","Fashion (casual, streetwear)","Fine Art","Fitness","Food","Gaming","Health/Beauty","Interior Design","LGBTQIA+","First Nations","Mental Health","Movies","Music","Current Events","Outdoor/Adventure","Parenting/Family","Pets","Photography/Videography","Podcasts","Sports","Sustainability/Environment","Tech/Gadgets","Travel","Vegan/Vegetarian","Wellness","Crypto/Web3"]
- story (string)
- creativeAesthetic (string)
`.trim();

const BRAND_FIELDS = `
- name (string): brand name
- industry (string): one of ["Food & Beverage","Fashion & Lifestyle","Tech & Gadgets","Gaming & Esports","Travel & Experiences","Music Events & Venues","Wellness & Lifestyle","Automotive","Sustainability & Eco-Conscious","Arts & Culture","Financial & Professional Services"]
- brandValues (string[]): subset of ["Community & connection","Authenticity & realness","Innovation & creativity","Quality & craftsmanship","Sustainability & environmental responsibility","Diversity & inclusion","Social impact & purpose","Fun & entertainment","Luxury & aspiration","Wellness & self-care"]
- targetAudience (string[]): subset of ["Gen Z (18-27)","Millennials (28-43)","Gen X (44-59)","Boomers+ (60+)"]
`.trim();

export const parseVibeIntro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      flow: z.enum(["musician", "brand"]),
      text: z.string().min(20).max(4000),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { assertQuota, consumeQuota } = await import("./usage.server");
    await assertQuota(context.userId, "vibe_intro");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");


    const schemaHint = data.flow === "musician" ? MUSICIAN_FIELDS : BRAND_FIELDS;
    const system = `You extract structured profile data from a short free-text intro.
Return ONLY a JSON object (no prose, no markdown) with these fields:
${schemaHint}

Rules:
- Use ONLY values from the provided option lists for enumerated fields.
- Omit any field you can't confidently infer (do not guess).
- For array fields, return [] if nothing applies.
- For "story" / "creativeAesthetic" / "bio" fields, write 1-2 polished sentences in the user's voice.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    return { fields: parsed as Record<string, any> };
  });
