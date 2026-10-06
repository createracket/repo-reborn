import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { checkReportForNewPosts } from "@/lib/report-post-discovery.functions";

type Props = {
  report: {
    id: string;
    auto_pull_posts?: boolean | null;
    auto_pull_start?: string | null;
    auto_pull_end?: string | null;
    auto_pull_last_run?: string | null;
    auto_pull_last_result?: { added?: number; errors?: string[]; skipped_no_handle?: number } | null;
  };
  creatorsWithoutHandle: string[];
  onChanged: () => Promise<void> | void;
};

export function ReportAutoPull({ report, creatorsWithoutHandle, onChanged }: Props) {
  const sb = supabase as any;
  const check = useServerFn(checkReportForNewPosts);
  const [checking, setChecking] = useState(false);

  async function update(patch: Record<string, unknown>) {
    const { error } = await sb.from("campaign_reports").update(patch).eq("id", report.id);
    if (error) return toast.error(error.message);
    await onChanged();
  }

  async function runNow() {
    if (!report.auto_pull_start) return toast.error("Set a campaign start date first");
    setChecking(true);
    try {
      const r = await check({ data: { reportId: report.id } });
      if (r.errors.length && !r.added) toast.error(r.errors[0]);
      else toast.success(r.added ? `${r.added} new post${r.added === 1 ? "" : "s"} added` : "No new posts found");
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  const last = report.auto_pull_last_result;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-display text-lg">Auto-add new posts daily</CardTitle>
          <CardDescription>
            Each morning, checks creators' Instagram and TikTok handles and adds any new post made between the campaign dates.
          </CardDescription>
        </div>
        <Switch
          checked={!!report.auto_pull_posts}
          onCheckedChange={(v) => {
            if (v && !report.auto_pull_start) return toast.error("Set a campaign start date first");
            void update({ auto_pull_posts: v });
          }}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Campaign start</Label>
            <Input type="date" value={report.auto_pull_start ?? ""} onChange={(e) => update({ auto_pull_start: e.target.value || null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Campaign end (optional)</Label>
            <Input type="date" value={report.auto_pull_end ?? ""} onChange={(e) => update({ auto_pull_end: e.target.value || null })} />
          </div>
          <Button variant="outline" onClick={runNow} disabled={checking}>
            {checking ? "Checking…" : "Check for new posts now"}
          </Button>
        </div>
        {report.auto_pull_last_run && (
          <p className="text-xs text-muted-foreground">
            Last checked {new Date(report.auto_pull_last_run).toLocaleString()} · {last?.added ?? 0} new post{last?.added === 1 ? "" : "s"} added
            {last?.errors?.length ? ` · ${last.errors.length} issue${last.errors.length === 1 ? "" : "s"}: ${last.errors[0]}` : ""}
          </p>
        )}
        {creatorsWithoutHandle.length > 0 && (
          <p className="text-xs text-destructive">
            No handle saved, so these can't be checked: {creatorsWithoutHandle.join(", ")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Deleted posts are remembered and never re-added. Stops automatically a week after the end date.</p>
      </CardContent>
    </Card>
  );
}
