import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const GateInfoSchema = z.object({ slug: z.string().trim().min(1).max(200) });

const UnlockSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(1).max(120),
});

const REPORT_FIELDS =
  "id, title, description, slug, published, published_at, header_image_url, categories, hide_categories, template";

const CREATOR_FIELDS = "id, name, handle, avatar_url, position, location, category";

/** Public: returns just enough to render the passcode gate (title + header image). */
export const getReportGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("campaign_reports")
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

/** Public: exchanges a valid passcode (+ lead email) for the full report payload. */
export const unlockReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UnlockSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("campaign_reports")
      .select(`${REPORT_FIELDS}, access_code`)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const record = row as (Record<string, Json> & { access_code: string | null; id: string }) | null;
    if (!record || !record.access_code) return { ok: false as const };

    const expected = String(record.access_code).trim().toLowerCase();
    if (expected !== data.code.trim().toLowerCase()) return { ok: false as const };

    const { access_code: _omit, ...report } = record;

    const { data: creators } = await supabaseAdmin
      .from("campaign_report_creators")
      .select(CREATOR_FIELDS)
      .eq("report_id", report.id as string)
      .order("position", { ascending: true });

    const creatorRows = (creators ?? []) as unknown as Array<Record<string, Json> & { id: string }>;
    let posts: Record<string, Json>[] = [];
    if (creatorRows.length > 0) {
      const { data: postRows } = await supabaseAdmin
        .from("campaign_report_posts")
        .select("*, updated_at")
        .in("creator_id", creatorRows.map((c) => c.id))
        .order("position", { ascending: true });
      posts = (postRows ?? []) as unknown as Record<string, Json>[];
    }

    await supabaseAdmin
      .from("campaign_report_access_leads")
      .insert({ report_id: report.id as string, email: data.email.toLowerCase() });

    return { ok: true as const, report, creators: creatorRows, posts };
  });
