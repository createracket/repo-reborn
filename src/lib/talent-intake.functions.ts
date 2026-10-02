import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "youtube",
  "spotify",
  "apple_music",
  "facebook",
  "x",
  "twitch",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export type SocialSuggestion = { url: string; source: "website" | "guess" };

const url = z.string().trim().max(500);
const SocialsSchema = z.object(
  Object.fromEntries(SOCIAL_KEYS.map((k) => [k, url.optional()])) as Record<SocialKey, z.ZodOptional<typeof url>>,
);

const AnswersSchema = z.object({
  artist_name: z.string().trim().min(1).max(200),
  website: url.optional(),
  contact_email: z.string().trim().max(254).optional(),
  socials: SocialsSchema,
  bio: z.string().trim().max(4000).optional(),
  photos: z.array(url).max(4).optional(),
  videos: z.array(url).max(4).optional(),
  followers: z.string().trim().max(500).optional(),
  audience: z.string().trim().max(1000).optional(),
  partners: z.string().trim().max(2000).optional(),
  extra: z.string().trim().max(6000).optional(),
  skipped: z.boolean().optional(),
});
export type TalentAnswers = z.infer<typeof AnswersSchema>;

const TokenSchema = z.string().trim().regex(/^[a-f0-9]{20,64}$/);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadPending(token: string) {
  const db = await admin();
  const { data, error } = await db
    .from("talent_intake_requests" as never)
    .select("id, artist_name, status")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error("Couldn't load this form.");
  return data as { id: string; artist_name: string | null; status: string } | null;
}

async function assertAdmin(supabase: { rpc: Function }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

// ---------- Admin ----------

export const adminCreateTalentIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ artistName: z.string().trim().max(200).optional(), note: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data: row, error } = await context.supabase
      .from("talent_intake_requests" as never)
      .insert({ artist_name: data.artistName || null, note: data.note || null, created_by: context.userId } as never)
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; token: string };
  });

export const adminListTalentIntakes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data, error } = await context.supabase
      .from("talent_intake_requests" as never)
      .select("id, token, artist_name, note, status, partner_page_id, submitted_at, created_at, answers")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      token: string;
      artist_name: string | null;
      note: string | null;
      status: string;
      partner_page_id: string | null;
      submitted_at: string | null;
      created_at: string;
      answers: Partial<TalentAnswers>;
    }>;
  });

export const adminDeleteTalentIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("talent_intake_requests" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Public (token-gated) ----------

export const getTalentIntake = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: TokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const row = await loadPending(data.token);
    if (!row) return { found: false as const };
    return { found: true as const, artistName: row.artist_name ?? "", submitted: row.status !== "pending" };
  });

const PATTERNS: Record<SocialKey, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/|accounts\/)[A-Za-z0-9_.]+\/?/i,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_.-]+|user\/[A-Za-z0-9_.-]+)/i,
  spotify: /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/[A-Za-z0-9]{22}/i,
  apple_music: /https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[^"'\s<>?]+/i,
  facebook: /https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|plugins|tr\b|dialog)[A-Za-z0-9_.-]+\/?/i,
  x: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)[A-Za-z0-9_]+/i,
  twitch: /https?:\/\/(?:www\.)?twitch\.tv\/[A-Za-z0-9_]+/i,
};

function safePublicUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".") || h === "localhost" || /^[\d.]+$/.test(h) || h.includes(":") || h.endsWith(".internal") || h.endsWith(".local"))
      return null;
    return u;
  } catch {
    return null;
  }
}

async function socialsFromWebsite(raw: string): Promise<Partial<Record<SocialKey, string>>> {
  const u = safePublicUrl(raw);
  if (!u) return {};
  try {
    const res = await fetch(u.toString(), {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; CreateRacketBot/1.0)", accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    const html = (await res.text()).slice(0, 1_500_000);
    const out: Partial<Record<SocialKey, string>> = {};
    for (const k of SOCIAL_KEYS) {
      const m = html.match(PATTERNS[k]);
      if (m) out[k] = m[0].replace(/["'\\]+$/, "");
    }
    return out;
  } catch {
    return {};
  }
}

function guessesFromName(name: string): Partial<Record<SocialKey, string>> {
  const handle = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
  if (handle.length < 2) return {};
  return {
    instagram: `https://www.instagram.com/${handle}/`,
    tiktok: `https://www.tiktok.com/@${handle}`,
    youtube: `https://www.youtube.com/@${handle}`,
  };
}

async function spotifySearch(name: string): Promise<string | null> {
  // Spotify's public search page isn't reachable without auth; use the
  // embeddable oEmbed-free approach: DuckDuckGo HTML results.
  try {
    const q = encodeURIComponent(`${name} site:open.spotify.com/artist`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; CreateRacketBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = decodeURIComponent(await res.text());
    const m = html.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]{22})/);
    return m ? `https://open.spotify.com/artist/${m[1]}` : null;
  } catch {
    return null;
  }
}

export const suggestTalentSocials = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: TokenSchema, name: z.string().trim().min(1).max(200), website: url.optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const row = await loadPending(data.token);
    if (!row || row.status !== "pending") throw new Error("This form is no longer open.");
    const [site, spotify] = await Promise.all([
      data.website ? socialsFromWebsite(data.website) : Promise.resolve({} as Partial<Record<SocialKey, string>>),
      spotifySearch(data.name),
    ]);
    const guesses = guessesFromName(data.name);
    const out: Partial<Record<SocialKey, SocialSuggestion>> = {};
    for (const k of SOCIAL_KEYS) {
      if (site[k]) out[k] = { url: site[k]!, source: "website" };
      else if (k === "spotify" && spotify) out[k] = { url: spotify, source: "guess" };
      else if (guesses[k]) out[k] = { url: guesses[k]!, source: "guess" };
    }
    return out;
  });

export const uploadTalentPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: TokenSchema,
        base64: z.string().min(1).max(Math.ceil((8 * 1024 * 1024 * 4) / 3) + 8),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const row = await loadPending(data.token);
    if (!row || row.status !== "pending") throw new Error("This form is no longer open.");
    const { putSpotlightObject } = await import("./spotlight-images.server");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    return putSpotlightObject(bytes, data.contentType, "spotlights");
  });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "artist";
}

function composeInfoDump(a: TalentAnswers): string {
  const lines: string[] = [`Artist/act: ${a.artist_name}`];
  if (a.website) lines.push(`Website: ${a.website}`);
  if (a.contact_email) lines.push(`Contact: ${a.contact_email}`);
  if (a.bio) lines.push(`\nAbout (from the artist):\n${a.bio}`);
  if (a.followers) lines.push(`\nAudience & stats:\n${a.followers}`);
  if (a.audience) lines.push(`\nWho their audience is:\n${a.audience}`);
  if (a.partners) lines.push(`\nPast brand partners:\n${a.partners}`);
  if (a.extra) lines.push(`\nAnything else:\n${a.extra}`);
  if (a.skipped) lines.push(`\n(The artist skipped the rest of the form — admin to complete.)`);
  return lines.join("\n");
}

export const submitTalentIntake = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: TokenSchema, answers: AnswersSchema }).parse(d))
  .handler(async ({ data }) => {
    const row = await loadPending(data.token);
    if (!row) throw new Error("This form link isn't valid.");
    if (row.status !== "pending") throw new Error("This form has already been sent — thank you!");
    const a = data.answers;
    const db = await admin();

    // Unique slug
    const base = slugify(a.artist_name);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: hit } = await db.from("partner_pages").select("id").eq("slug", slug).maybeSingle();
      if (!hit) break;
      slug = `${base}-${i}`;
    }

    const clean = (v?: string) => (v && /^https?:\/\//i.test(v.trim()) ? v.trim() : v?.trim() ? `https://${v.trim()}` : "");
    const links: Record<string, unknown> = { tab_page_name: a.artist_name };
    for (const k of SOCIAL_KEYS) links[k] = clean(a.socials[k]);
    if (a.contact_email) links.contact = a.contact_email;
    (a.photos ?? []).forEach((p, i) => (links[`photo${i + 1}`] = clean(p)));
    (a.videos ?? []).forEach((v, i) => (links[`video${i + 1}`] = clean(v)));
    links.talent_intake_id = row.id;
    links.talent_intake_text = composeInfoDump(a);

    const { data: page, error } = await db
      .from("partner_pages")
      .insert({
        slug,
        type: "Artist",
        headline: a.artist_name,
        host_bio: a.bio || null,
        header_image_url: a.photos?.[0] ? clean(a.photos[0]) : null,
        published: false,
        links,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error("Couldn't save your answers. Please try again.");

    await db
      .from("talent_intake_requests" as never)
      .update({
        status: "submitted",
        answers: a,
        partner_page_id: (page as { id: string }).id,
        submitted_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);

    return { ok: true };
  });
