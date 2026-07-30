import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GateInfoSchema = z.object({ slug: z.string().trim().min(1).max(200) });

const UnlockSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(1).max(120),
});

const ROSTER_FIELDS =
  "id, title, description, slug, published, published_at, updated_at, header_image_url, hide_prospect_tags, hide_statuses, est_engagement_pct, categories, custom_links";

const ITEM_FIELDS =
  "id, kind, name, avatar_url, vibe, instagram_url, instagram_followers, tiktok_url, tiktok_followers, youtube_url, youtube_subscribers, spotify_url, spotify_monthly_listens, apple_music_url, apple_music_followers, example_video_url, bio_page_url, content_review_url, position, status, category, categories, location";

/** Public: returns just enough to render the passcode gate (title + header image). */
export const getRosterGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("rosters")
      .select("title, header_image_url, access_code, access_code_label, published, slug")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (!row || !(row as { access_code: string | null }).access_code) {
      return { gated: false as const };
    }

    const r = row as { title: string; header_image_url: string | null; access_code_label: string | null };
    return {
      gated: true as const,
      title: r.title,
      header_image_url: r.header_image_url,
      code_label: r.access_code_label || "Access code",
    };
  });

/** Public: exchanges a valid passcode (+ lead email) for the full roster payload. */
export const unlockRoster = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UnlockSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("rosters")
      .select(`${ROSTER_FIELDS}, access_code`)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const record = row as (Record<string, string | number | boolean | null | string[] | { label: string; url: string }[]> & {
      access_code: string | null;
      id: string;
    }) | null;
    if (!record || !record.access_code) return { ok: false as const };

    const expected = String(record.access_code).trim().toLowerCase();
    if (expected !== data.code.trim().toLowerCase()) return { ok: false as const };

    const { access_code: _omit, ...roster } = record;

    const { data: items } = await supabaseAdmin
      .from("roster_items")
      .select(ITEM_FIELDS)
      .eq("roster_id", roster.id as string)
      .order("position", { ascending: true });

    await supabaseAdmin
      .from("roster_access_leads")
      .insert({ roster_id: roster.id as string, email: data.email.toLowerCase() });

    return { ok: true as const, roster, items: items ?? [] };
  });
