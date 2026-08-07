import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ListeningAnalysis, ScannedPost } from "./social-listening.functions";

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
      .order("display_name", { ascending: true })
      .limit(20);
    if (data.q) q = q.or(`display_name.ilike.%${data.q}%,email.ilike.%${data.q}%`);
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

export interface DashboardReport {
  id: string;
  artist_name: string;
  handle: string;
  platform: string;
  report_title: string | null;
  notes: string | null;
  created_at: string;
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
        "id, artist_name, handle, platform, report_title, notes, created_at, analysis, posts",
      )
      .eq("dashboard_visible", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (rows ?? []) as unknown as DashboardReport[];
  });
