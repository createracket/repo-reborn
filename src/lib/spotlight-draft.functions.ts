import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scrapeProfileByUrl, spotifyArtistCore } from "./campaign-scrapers.functions";

const SocialsSchema = z
  .object({
    instagram: z.string().trim().max(300).optional(),
    tiktok: z.string().trim().max(300).optional(),
    youtube: z.string().trim().max(300).optional(),
    x: z.string().trim().max(300).optional(),
    twitch: z.string().trim().max(300).optional(),
    spotify: z.string().trim().max(300).optional(),
  })
  .partial();

const InputSchema = z
  .object({
    text: z.string().trim().max(20000).default(""),
    artistName: z.string().trim().max(200).optional(),
    socials: SocialsSchema.optional(),
  })
  .refine(
    (v) =>
      v.text.length >= 40 ||
      Object.values(v.socials ?? {}).some((s) => typeof s === "string" && s.trim().length > 0),
    { message: "Paste some detail or at least one social handle." },
  );

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

export type SpotlightEnrichment = {
  links: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    x?: string;
    twitch?: string;
    spotify?: string;
  };
  followers: {
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    x?: number;
    twitch?: number;
    spotify?: number;
  };
  total_followers?: number;
  monthly_streams?: number;
  total_streams?: number;
  avatar_url?: string;
  spotify_name?: string;
  spotify_genres?: string[];
  errors: string[];
};

type Platform = "instagram" | "tiktok" | "youtube" | "x" | "twitch" | "spotify";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  twitch: "Twitch",
  spotify: "Spotify",
};

/** Accepts a full URL or a bare @handle and returns a canonical profile URL. */
function toProfileUrl(platform: Platform, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(value)) return `https://${value}`;
  const handle = value.replace(/^@/, "").trim();
  if (!handle) return null;
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    case "twitch":
      return `https://www.twitch.tv/${handle}`;
    case "spotify":
      return /^[A-Za-z0-9]{22}$/.test(handle)
        ? `https://open.spotify.com/artist/${handle}`
        : null;
  }
}

async function enrichSocials(
  socials: Record<string, string | undefined>,
): Promise<SpotlightEnrichment> {
  const out: SpotlightEnrichment = { links: {}, followers: {}, errors: [] };
  const entries = (Object.keys(PLATFORM_LABEL) as Platform[])
    .map((p) => [p, toProfileUrl(p, socials[p] ?? "")] as const)
    .filter((e): e is readonly [Platform, string] => !!e[1]);

  if (entries.length === 0) return out;

  const results = await Promise.all(
    entries.map(async ([platform, url]) => {
      try {
        if (platform === "spotify") {
          return { platform, url, spotify: await spotifyArtistCore({ url }) } as const;
        }
        return { platform, url, profile: await scrapeProfileByUrl(url) } as const;
      } catch (e) {
        return { platform, url, error: (e as Error).message } as const;
      }
    }),
  );

  for (const r of results) {
    out.links[r.platform] = r.url;
    const label = PLATFORM_LABEL[r.platform];
    if ("error" in r && r.error) {
      out.errors.push(`Couldn't read ${label}`);
      continue;
    }
    if ("spotify" in r && r.spotify) {
      if (!r.spotify.ok) {
        out.errors.push(`Couldn't read ${label}`);
        continue;
      }
      if (r.spotify.followers != null) out.followers.spotify = r.spotify.followers;
      if (r.spotify.monthly_listeners != null) out.monthly_streams = r.spotify.monthly_listeners;
      if (r.spotify.total_streams != null) out.total_streams = r.spotify.total_streams;
      if (!out.avatar_url && r.spotify.avatar_url) out.avatar_url = r.spotify.avatar_url;
      if (r.spotify.name) out.spotify_name = r.spotify.name;
      if (r.spotify.genres?.length) out.spotify_genres = r.spotify.genres;
      continue;
    }
    if ("profile" in r && r.profile) {
      if (!r.profile.ok) {
        out.errors.push(`Couldn't read ${label}`);
        continue;
      }
      if (r.profile.followers != null) out.followers[r.platform] = r.profile.followers;
      if (!out.avatar_url && r.profile.avatar_url) out.avatar_url = r.profile.avatar_url;
    }
  }

  // Social audience total excludes streaming platforms (Spotify).
  const socialTotal = (["instagram", "tiktok", "youtube", "x", "twitch"] as const).reduce(
    (sum, p) => sum + (out.followers[p] ?? 0),
    0,
  );
  if (socialTotal > 0) out.total_followers = socialTotal;

  return out;
}

function describeEnrichment(
  enrichment: SpotlightEnrichment,
  spotifyName: string | null,
  spotifyGenres: string[],
): string | null {
  const lines: string[] = [];
  for (const p of Object.keys(PLATFORM_LABEL) as Platform[]) {
    const url = enrichment.links[p];
    if (!url) continue;
    const count = enrichment.followers[p];
    const suffix =
      count != null
        ? ` — ${count.toLocaleString("en-GB")} ${p === "spotify" ? "followers" : p === "youtube" ? "subscribers" : "followers"}`
        : "";
    lines.push(`${PLATFORM_LABEL[p]}: ${url}${suffix}`);
  }
  if (enrichment.monthly_streams != null)
    lines.push(`Spotify monthly listeners: ${enrichment.monthly_streams.toLocaleString("en-GB")}`);
  if (enrichment.total_streams != null)
    lines.push(`Spotify total streams: ${enrichment.total_streams.toLocaleString("en-GB")}`);
  if (spotifyName) lines.push(`Spotify artist name: ${spotifyName}`);
  if (spotifyGenres.length) lines.push(`Spotify genres: ${spotifyGenres.join(", ")}`);
  if (lines.length === 0) return null;
  return `Verified social data (fetched live — treat as fact, prefer it over anything inferred, never contradict it):\n${lines.join("\n")}`;
}

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
- Never invent facts, dates, brands or links that are not in the source text or the verified social data.
- Where a "Verified social data" block is supplied, treat those links, handles, follower counts, streaming figures and genres as authoritative; never contradict them and never restate a different number.
- You may use follower scale and genres to ground the bio and audience segments, but do not quote raw follower numbers in the copy unless the source email does.
- Omit any field you cannot support from the sources.
- Keep list items short (max ~12 words each), no bullets or numbering characters.
- Write in confident, plain, non-corporate language. No emojis.
- Always use British English spelling (e.g. capitalise, optimise, colour, personalise) — never US spelling.`;

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

    // Fetch public profile data for any supplied handles first, so the model is
    // grounded in real numbers and links instead of guessing from a handle.
    const enrichment = await enrichSocials(data.socials ?? {});

    const spotifyName = enrichment.spotify_name ?? null;
    const verified = describeEnrichment(enrichment);

    const userContent = [
      data.artistName ? `Artist/act name: ${data.artistName}` : null,
      verified,
      data.text ? `Source email / info dump:\n${data.text}` : null,
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

    const fallbackName = str(parsed.headline) ?? spotifyName ?? undefined;

    const draft: SpotlightDraft = {
      headline: fallbackName,
      subtitle: str(parsed.subtitle),
      slug:
        str(parsed.slug)?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ??
        fallbackName?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      intro: str(parsed.intro),
      host_bio: str(parsed.host_bio),
      partnership_pitch: str(parsed.partnership_pitch),
      eoi_opportunities: list(parsed.eoi_opportunities),
      audience_segments: list(parsed.audience_segments),
      // Fetched links win over anything the model echoed back.
      instagram: enrichment.links.instagram ?? str(parsed.instagram),
      tiktok: enrichment.links.tiktok ?? str(parsed.tiktok),
      youtube: enrichment.links.youtube ?? str(parsed.youtube),
      spotify: enrichment.links.spotify ?? str(parsed.spotify),
      contact: str(parsed.contact),
    };

    await consumeQuota(context.userId, "spotlight_draft");
    return { draft, enrichment };
  });
