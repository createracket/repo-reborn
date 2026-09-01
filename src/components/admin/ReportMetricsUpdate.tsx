import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  startMetricsJob,
  getMetricsJob,
  cancelMetricsJob,
  dismissMetricsJob,
  previewMetricsJob,
  type JobProgress,
} from "@/lib/report-metrics-jobs.functions";

function mins(seconds: number) {
  if (seconds <= 0) return "under a minute";
  const m = Math.ceil(seconds / 60);
  return `about ${m} minute${m === 1 ? "" : "s"}`;
}

export function ReportMetricsUpdate({
  reportId,
  onFinished,
}: {
  reportId: string;
  onFinished?: () => void | Promise<void>;
}) {
  const [job, setJob] = useState<JobProgress | null>(null);
  const [confirm, setConfirm] = useState<{ total: number; skipped: number; seconds: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const wasRunning = useRef(false);

  async function refresh() {
    try {
      setJob(await getMetricsJob({ data: { reportId } }));
    } catch {
      /* not admin / no job */
    }
  }

  useEffect(() => {
    setJob(null);
    void refresh();
  }, [reportId]);

  useEffect(() => {
    if (job?.status !== "running") {
      if (wasRunning.current) {
        wasRunning.current = false;
        void onFinished?.();
      }
      return;
    }
    wasRunning.current = true;
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [job?.status, reportId]);

  async function openConfirm() {
    setBusy(true);
    try {
      const p = await previewMetricsJob({ data: { reportId } });
      if (p.total === 0) {
        toast.error("No posts with a URL to update.");
        return;
      }
      setConfirm({ total: p.total, skipped: p.skipped, seconds: p.estimateSeconds });
    } catch (e) {
      toast.error((e as Error).message ?? "Could not check this report.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setConfirm(null);
    setBusy(true);
    try {
      const res = await startMetricsJob({ data: { reportId } });
      toast.success(`Updating ${res.total} posts — ${mins(res.estimateSeconds)}.`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message ?? "Could not start the update.");
    } finally {
      setBusy(false);
    }
  }

  const running = job?.status === "running";
  const pct = job && job.total > 0 ? Math.round(((job.done + job.failed) / job.total) * 100) : 0;

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Metrics</div>
            <p className="text-xs text-muted-foreground">
              Re-fetch views, likes and comments for every post in this report. Runs in the
              background — you can keep working or close the page.
            </p>
          </div>
          <Button type="button" onClick={openConfirm} disabled={busy || running}>
            {busy || running ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            {running ? "Updating…" : "Update all metrics"}
          </Button>
        </div>

        {job && (
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${running ? pct : 100}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {running
                  ? `${job.done + job.failed} of ${job.total} done · ${mins(job.remaining_seconds)} left`
                  : job.status === "complete"
                    ? `Finished — ${job.done} updated${job.failed ? `, ${job.failed} failed` : ""}.`
                    : job.status === "cancelled"
                      ? "Cancelled."
                      : "Update failed."}
              </span>
              {running ? (
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={async () => {
                    await cancelMetricsJob({ data: { jobId: job.id } });
                    toast.success("Cancelling after the current batch…");
                    await refresh();
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 underline hover:text-foreground"
                  onClick={async () => {
                    await dismissMetricsJob({ data: { jobId: job.id } });
                    setJob(null);
                  }}
                >
                  <X className="size-3" /> Dismiss
                </button>
              )}
            </div>
            {!running && job.failures.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {job.failures.map((f, i) => (
                  <li key={i}>
                    <span className="text-foreground">{f.label}</span> — {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update all metrics?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? `${confirm.total} post${confirm.total === 1 ? "" : "s"} will be re-fetched — ${mins(
                    confirm.seconds,
                  )}.${confirm.skipped ? ` ${confirm.skipped} post(s) without a URL will be skipped.` : ""} Existing values are only overwritten when a fresh number comes back.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={start}>Start update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
