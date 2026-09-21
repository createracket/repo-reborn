import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GateInfoSchema = z.object({ slug: z.string().trim().min(1).max(200) });

const UnlockSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(1).max(120),
});

const GuestInterestSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(120).optional(),
  selectedParts: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
});

const MemberInterestSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  selectedParts: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
});

function validSelectedParts(selectedParts: string[], opportunities: string[]) {
  const available = new Set(opportunities);
  return [...new Set(selectedParts)].filter((part) => available.has(part));
}

/** Signed-in visitor: register interest with the selected opportunities. */
export const registerSpotlightMemberInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MemberInterestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    let pageQuery = context.supabase
      .from("partner_pages")
      .select("id, eoi_opportunities")
      .eq("slug", data.slug);
    if (!isAdmin) pageQuery = pageQuery.eq("published", true);

    const { data: row } = await pageQuery.maybeSingle();
    if (!row) return { ok: false as const };

    const selectedParts = validSelectedParts(data.selectedParts, row.eoi_opportunities ?? []);
    if (selectedParts.length !== new Set(data.selectedParts).size) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("spotlight_interests")
      .select("id")
      .eq("partner_page_id", row.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    const result = existing
      ? await supabaseAdmin.from("spotlight_interests").update({ selected_parts: selectedParts }).eq("id", existing.id)
      : await supabaseAdmin.from("spotlight_interests").insert({
          partner_page_id: row.id,
          user_id: context.userId,
          selected_parts: selectedParts,
        });
    return { ok: !result.error as boolean };
  });

/** Public: capture a signed-out visitor's email as an expression of interest. */
export const registerSpotlightGuestInterest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GuestInterestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select("id, headline, section, eoi_opportunities")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const page = row as { id: string; headline: string; section: string | null; eoi_opportunities: string[] } | null;
    if (!page) return { ok: false as const };

    const selectedParts = validSelectedParts(data.selectedParts, page.eoi_opportunities ?? []);
    if (selectedParts.length !== new Set(data.selectedParts).size) return { ok: false as const };

    const { data: existing } = await supabaseAdmin
      .from("spotlight_interests")
      .select("id")
      .eq("partner_page_id", page.id)
      .eq("guest_email", data.email.toLowerCase())
      .maybeSingle();
    const { error } = existing
      ? await supabaseAdmin.from("spotlight_interests").update({ selected_parts: selectedParts }).eq("id", existing.id)
      : await supabaseAdmin.from("spotlight_interests").insert({
        partner_page_id: page.id,
        user_id: null,
        guest_email: data.email.toLowerCase(),
        guest_name: data.name ?? null,
        selected_parts: selectedParts,
      } as never);

    // Duplicate registration is still a success from the visitor's point of view.
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return { ok: false as const };
    }

    const { sendForEvent } = await import("@/lib/email/send.server");
    const link = `${page.section === "brief" ? "/brief/" : "/spotlight/"}${data.slug}`;
    await sendForEvent("interest_registered", {
      recipientEmail: data.email,
      templateData: {
        name: data.name ?? "",
        email: data.email,
        page_title: page.headline,
        link,
      },
    });

    return { ok: true as const };
  });



const PAGE_FIELDS =
  "id, slug, section, type, headline, subtitle, intro, host_bio, partnership_pitch, eoi_opportunities, dos_donts, audience_segments, links, published, header_image_url, profile_image_url, total_followers, total_streams, monthly_streams, avg_reach, avg_engagement";

/** Public: returns just enough to render the passcode gate (headline + header image). */
export const getSpotlightGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select("headline, subtitle, header_image_url, access_code, access_code_label, links")
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
           links: Record<string, unknown> | null;
        }
      | null;

    if (!r || !r.access_code) return { gated: false as const };

    return {
      gated: true as const,
      headline: r.headline,
      subtitle: r.subtitle,
      header_image_url: r.header_image_url,
      code_label: r.access_code_label || "Access code",
      tab_page_name: typeof r.links?.["tab_page_name"] === "string" ? r.links["tab_page_name"] : null,
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

/**
 * Signed-in members: returns a published spotlight without the passcode gate when the
 * caller is an admin or is on the spotlight's share list (by user id or email).
 */
export const getSpotlightForMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GateInfoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("partner_pages")
      .select(PAGE_FIELDS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const page = row as
      | (Record<string, string | number | boolean | null | string[] | Record<string, string>> & {
          id: string;
        })
      | null;
    if (!page) return { ok: false as const };

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      const email = String((context.claims as Record<string, unknown>)?.["email"] ?? "").toLowerCase();
      const { data: shares } = await supabaseAdmin
        .from("partner_page_shares")
        .select("target_user_id, target_email")
        .eq("partner_page_id", page.id);

      const allowed = ((shares ?? []) as { target_user_id: string | null; target_email: string | null }[]).some(
        (s) =>
          s.target_user_id === context.userId ||
          (!!s.target_email && !!email && s.target_email.toLowerCase() === email),
      );
      if (!allowed) return { ok: false as const };
    }

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
