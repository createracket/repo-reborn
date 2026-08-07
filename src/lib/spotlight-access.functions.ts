import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GateInfoSchema = z.object({ slug: z.string().trim().min(1).max(200) });

const UnlockSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(1).max(120),
});

const PAGE_FIELDS =
  "id, slug, type, headline, subtitle, intro, host_bio, partnership_pitch, eoi_opportunities, audience_segments, links, published, header_image_url, profile_image_url, total_followers, total_streams, monthly_streams, avg_reach, avg_engagement";

/** Public: returns just enough to render the passcode gate (headline + header image). */
export const getSpotlightGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select("headline, subtitle, header_image_url, access_code, access_code_label")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const r = row as
      | {
          headline: string;
          subtitle: string | null;
          header_image_url: string | null;
          access_code: string | null;
          access_code_label: string | null;
        }
      | null;

    if (!r || !r.access_code) return { gated: false as const };

    return {
      gated: true as const,
      headline: r.headline,
      subtitle: r.subtitle,
      header_image_url: r.header_image_url,
      code_label: r.access_code_label || "Access code",
    };
  });

/** Public: exchanges a valid passcode (+ lead email) for the full spotlight payload. */
export const unlockSpotlight = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UnlockSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select(`${PAGE_FIELDS}, access_code`)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const record = row as
      | (Record<string, string | number | boolean | null | string[] | Record<string, string>> & {
          access_code: string | null;
          id: string;
        })
      | null;
    if (!record || !record.access_code) return { ok: false as const };

    const expected = String(record.access_code).trim().toLowerCase();
    if (expected !== data.code.trim().toLowerCase()) return { ok: false as const };

    const { access_code: _omit, ...page } = record;

    await supabaseAdmin
      .from("spotlight_access_leads")
      .insert({ partner_page_id: record.id, email: data.email.toLowerCase() });

    return { ok: true as const, page };
  });

/** Admin-only: returns a spotlight regardless of published/gated state, for previewing drafts. */
export const getSpotlightPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select(PAGE_FIELDS)
      .eq("slug", data.slug)
      .maybeSingle();

    if (!row) return { ok: false as const };
    return { ok: true as const, page: row };
  });
