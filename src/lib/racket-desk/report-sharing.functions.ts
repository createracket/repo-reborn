import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ListeningAnalysis, ScannedPost } from "./social-listening.functions";
import type { ThumbFrame } from "@/lib/thumb-frame";

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export interface ShareTarget {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

/** Admin: search profiles that a report can be assigned to. */
export const searchReportAssignees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().trim().max(120).default("") }).parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<ShareTarget[]> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    let q = (supabase as any)
      .from("profiles")
      .select("id, display_name, email")
      .order("display_name", { ascending: true, nullsFirst: false })
      .order("email", { ascending: true })
      .limit(200);
    // Strip characters that would corrupt the PostgREST filter string.
    const term = data.q.replace(/[,()"'\\%*]/g, " ").trim();
    if (term) q = q.or(`display_name.ilike.%${term}%,email.ilike.%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as any[]).map((r) => ({
      user_id: r.id,
      display_name: r.display_name ?? null,
      email: r.email ?? null,
    }));
  });

/** Admin: who this report is currently assigned to. */
export const listReportAssignees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<ShareTarget[]> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data: shares, error } = await supabase
      .from("social_listening_scan_shares")
      .select("target_user_id")
      .eq("scan_id", data.scanId);
    if (error) throw new Error(error.message);
    const ids = ((shares ?? []) as any[]).map((s) => s.target_user_id as string);
    if (!ids.length) return [];
    const { data: rows, error: pErr } = await (supabase as any)
      .from("profiles")
      .select("id, display_name, email")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    return ((rows ?? []) as any[]).map((r) => ({
      user_id: r.id,
      display_name: r.display_name ?? null,
      email: r.email ?? null,
    }));
  });

/** Admin: toggle whether a saved report appears in the Project planner. */
export const setReportDashboardVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ scanId: z.string().uuid(), visible: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase
      .from("social_listening_scans")
      .update({ dashboard_visible: data.visible, saved: true })
      .eq("id", data.scanId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: assign or unassign a user profile to a saved report. */
export const setReportAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        scanId: z.string().uuid(),
        targetUserId: z.string().uuid(),
        assigned: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    if (data.assigned) {
      const { error } = await supabase
        .from("social_listening_scan_shares")
        .upsert(
          { scan_id: data.scanId, target_user_id: data.targetUserId, created_by: userId },
          { onConflict: "scan_id,target_user_id" },
        );
      if (error) throw new Error(error.message);

      // Only sends when the "Listening report shared" trigger is on.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [{ data: profile }, { data: scan }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("email, display_name")
            .eq("id", data.targetUserId)
            .maybeSingle(),
          supabaseAdmin
            .from("social_listening_scans")
            .select("report_title, artist_name")
            .eq("id", data.scanId)
            .maybeSingle(),
        ]);
        const p = profile as { email: string | null; display_name: string | null } | null;
        if (p?.email) {
          const s = scan as { report_title: string | null; artist_name: string | null } | null;
          const { sendForEvent } = await import("@/lib/email/send.server");
          await sendForEvent("listening_report_shared", {
            recipientEmail: p.email,
            templateData: {
              name: p.display_name ?? "",
              page_title: s?.report_title ?? s?.artist_name ?? "Listening report",
              link: `/listening-report/${data.scanId}`,
            },
          });
        }
      } catch (e) {
        console.error("listening_report_shared notify failed", e);
      }
    } else {

      const { error } = await supabase
        .from("social_listening_scan_shares")
        .delete()
        .eq("scan_id", data.scanId)
        .eq("target_user_id", data.targetUserId);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Admin: save the planner thumbnail + framing for a report. */
export const setReportThumbnail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        scanId: z.string().uuid(),
        thumbnailUrl: z.string().url().nullable(),
        thumbFrame: z
          .object({
            fit: z.enum(["cover", "contain"]),
            bg: z.enum(["card", "black", "white"]),
            zoom: z.number().min(50).max(150),
            position: z.enum(["top", "center", "bottom"]),
          })
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await (supabase as any)
      .from("social_listening_scans")
      .update({ thumbnail_url: data.thumbnailUrl, thumb_frame: data.thumbFrame })
      .eq("id", data.scanId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: the signed-in admin's own share target, so they can share a report with themselves. */
export const getMyShareTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShareTarget> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data: row } = await (supabase as any)
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", userId)
      .maybeSingle();
    return {
      user_id: userId,
      display_name: row?.display_name ?? "You (admin)",
      email: row?.email ?? null,
    };
  });

export interface DashboardReport {
  id: string;
  artist_name: string;
  handle: string;
  platform: string;
  report_title: string | null;
  notes: string | null;
  created_at: string;
  thumbnail_url: string | null;
  thumb_frame: ThumbFrame | null;
}

export interface ListeningReportDetail extends DashboardReport {
  analysis: ListeningAnalysis;
  posts: ScannedPost[];
}

/**
 * Reports visible on the signed-in user's dashboard: admins see everything pushed
 * to the dashboard, everyone else only sees reports assigned to them (RLS enforced).
 */
export const listDashboardReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardReport[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("social_listening_scans")
      .select(
        "id, artist_name, handle, platform, report_title, notes, created_at, thumbnail_url, thumb_frame",
      )
      .eq("dashboard_visible", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (rows ?? []) as unknown as DashboardReport[];
  });

/** Full report for the detail page. RLS limits this to admins and assigned users. */
export const getListeningReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<ListeningReportDetail | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("social_listening_scans")
      .select(
        "id, artist_name, handle, platform, report_title, notes, created_at, thumbnail_url, thumb_frame, analysis, posts",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return null;
    return row as unknown as ListeningReportDetail;
  });

