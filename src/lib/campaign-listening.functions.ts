import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listeningEnabled } from "./campaign-listening";

const inputSchema = z.object({ reportId: z.string().uuid() });
async function verifyAdminReport(supabase: any, userId: string, reportId: string) {
  const { data: role, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !role) throw new Error("Admin access required");
  const { data: report } = await supabase.from("campaign_reports").select("id, slug").eq("id", reportId).maybeSingle();
  if (!report || !listeningEnabled(report.slug)) throw new Error("Listening is available on the Chats report only");
}
export const listCampaignListeningChoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await verifyAdminReport(sb, context.userId, data.reportId);
    const [scans, links] = await Promise.all([
      sb.from("social_listening_scans").select("id, artist_name, report_title, created_at, saved").order("created_at", { ascending: false }).limit(100),
      sb.from("campaign_report_listening_links").select("scan_id").eq("report_id", data.reportId),
    ]);
    if (scans.error || links.error) throw new Error("Could not load listening reports");
    const selected = new Set((links.data ?? []).map((link: { scan_id: string }) => link.scan_id));
    return (scans.data ?? []).map((scan: { id: string; artist_name: string; report_title: string | null; created_at: string; saved: boolean }) => ({ ...scan, selected: selected.has(scan.id) }));
  });
export const setCampaignListeningLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.extend({ scanId: z.string().uuid(), selected: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await verifyAdminReport(sb, context.userId, data.reportId);
    if (data.selected) {
      const { data: scan, error: saveError } = await sb.from("social_listening_scans").update({ saved: true }).eq("id", data.scanId).select("id").maybeSingle();
      if (saveError || !scan) throw new Error("Listening report not found");
      const { error } = await sb.from("campaign_report_listening_links").upsert({ report_id: data.reportId, scan_id: data.scanId });
      if (error) throw new Error("Could not add listening report");
    } else {
      const { error } = await sb.from("campaign_report_listening_links").delete().eq("report_id", data.reportId).eq("scan_id", data.scanId);
      if (error) throw new Error("Could not remove listening report");
    }
    return { ok: true };
  });