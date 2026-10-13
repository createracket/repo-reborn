import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const sb = supabase as any;

/** Recalculates every post's ER as (views + likes + comments) ÷ followers. Posts without followers are skipped. */
export function ReportErSweep({ reportId, onFinished }: { reportId: string; onFinished: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm("Recalculate every post's engagement rate using views? This replaces existing ER values.")) return;
    setBusy(true);
    try {
      const { data: creators, error: ce } = await sb.from("campaign_report_creators").select("id").eq("report_id", reportId);
      if (ce) throw ce;
      const ids = (creators ?? []).map((c: any) => c.id);
      if (!ids.length) return toast.info("No creators in this report yet");
      const { data: posts, error: pe } = await sb
        .from("campaign_report_posts")
        .select("id, views, likes, comments, followers, engagement_rate_pct")
        .in("creator_id", ids);
      if (pe) throw pe;
      let updated = 0, skipped = 0, unchanged = 0;
      for (const p of posts ?? []) {
        const f = Number(p.followers);
        const total = (Number(p.views) || 0) + (Number(p.likes) || 0) + (Number(p.comments) || 0);
        if (!f || f <= 0 || total <= 0) { skipped++; continue; }
        const value = Number(((total / f) * 100).toFixed(2));
        if (p.engagement_rate_pct != null && Number(p.engagement_rate_pct) === value) { unchanged++; continue; }
        const { error } = await sb.from("campaign_report_posts").update({ engagement_rate_pct: value }).eq("id", p.id);
        if (error) { skipped++; continue; }
        updated++;
      }
      toast.success(`ER updated on ${updated} posts${unchanged ? `, ${unchanged} already correct` : ""}${skipped ? `, ${skipped} skipped (missing followers or stats)` : ""}`);
      await onFinished();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not recalculate ER");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant="purple" disabled={busy} onClick={run}>
      {busy ? "Calculating…" : "Calculate all ER by views"}
    </Button>
  );
}
