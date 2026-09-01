import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Seconds we assume per post, with 4 running at a time. */
export const SECONDS_PER_POST = 18;
export const CONCURRENCY = 4;

export function estimateSeconds(posts: number): number {
  return Math.ceil(posts / CONCURRENCY) * SECONDS_PER_POST;
}

export type JobProgress = {
  id: string;
  report_id: string;
  status: "running" | "complete" | "cancelled" | "failed";
  total: number;
  done: number;
  failed: number;
  started_at: string;
  finished_at: string | null;
  estimate_seconds: number;
  remaining_seconds: number;
  failures: Array<{ label: string; error: string }>;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Admin access required.");
}

/** Fire-and-forget kick of the worker route. */
export function kickWorker(origin: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return;
  void fetch(`${origin}/api/public/hooks/report-metrics-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: "{}",
  }).catch(() => {});
}

export const startMetricsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ reportId: z.string().uuid(), notifyEmail: z.string().email().nullable().optional() })
      .parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Don't stack jobs for the same report.
    const { data: running } = await supabaseAdmin
      .from("metric_jobs")
      .select("id")
      .eq("report_id", data.reportId)
      .eq("status", "running")
      .maybeSingle();
    if (running) throw new Error("A metrics update is already running for this report.");

    const { data: creators } = await supabaseAdmin
      .from("campaign_report_creators")
      .select("id, name")
      .eq("report_id", data.reportId);
    const creatorIds = (creators ?? []).map((c) => c.id);
    if (creatorIds.length === 0) throw new Error("This report has no creators yet.");

    const { data: posts } = await supabaseAdmin
      .from("campaign_report_posts")
      .select("id, post_url, creator_id, platform")
      .in("creator_id", creatorIds);

    const nameById = new Map((creators ?? []).map((c) => [c.id, c.name as string]));
    const queued = (posts ?? []).filter((p) => !!p.post_url && p.post_url!.trim().length > 0);
    const skipped = (posts ?? []).length - queued.length;
    if (queued.length === 0) throw new Error("No posts with a URL to update.");

    const { data: job, error: jobErr } = await supabaseAdmin
      .from("metric_jobs")
      .insert({
        report_id: data.reportId,
        total: queued.length,
        notify_email: data.notifyEmail ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (jobErr || !job) throw new Error(jobErr?.message ?? "Could not start job.");

    const { error: itemErr } = await supabaseAdmin.from("metric_job_items").insert(
      queued.map((p) => ({
        job_id: job.id,
        post_id: p.id,
        post_url: p.post_url,
        label: `${nameById.get(p.creator_id) ?? "Unknown"} · ${p.platform}`,
      })),
    );
    if (itemErr) throw new Error(itemErr.message);

    const origin = new URL(getRequest().url).origin;
    kickWorker(origin);

    return {
      jobId: job.id as string,
      total: queued.length,
      skipped,
      estimateSeconds: estimateSeconds(queued.length),
    };
  });

export const previewMetricsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reportId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: creators } = await supabaseAdmin
      .from("campaign_report_creators")
      .select("id")
      .eq("report_id", data.reportId);
    const ids = (creators ?? []).map((c) => c.id);
    if (!ids.length) return { total: 0, skipped: 0, estimateSeconds: 0 };
    const { data: posts } = await supabaseAdmin
      .from("campaign_report_posts")
      .select("id, post_url")
      .in("creator_id", ids);
    const total = (posts ?? []).filter((p) => !!p.post_url?.trim()).length;
    return {
      total,
      skipped: (posts ?? []).length - total,
      estimateSeconds: estimateSeconds(total),
    };
  });

export const getMetricsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reportId: z.string().uuid() }).parse)
  .handler(async ({ data, context }): Promise<JobProgress | null> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await supabaseAdmin
      .from("metric_jobs")
      .select("*")
      .eq("report_id", data.reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!job) return null;

    const { data: failures } = await supabaseAdmin
      .from("metric_job_items")
      .select("label, error")
      .eq("job_id", job.id)
      .eq("status", "failed")
      .limit(50);

    const remainingPosts = Math.max(0, job.total - job.done - job.failed);
    return {
      id: job.id,
      report_id: job.report_id,
      status: job.status as JobProgress["status"],
      total: job.total,
      done: job.done,
      failed: job.failed,
      started_at: job.started_at,
      finished_at: job.finished_at,
      estimate_seconds: estimateSeconds(job.total),
      remaining_seconds: estimateSeconds(remainingPosts),
      failures: (failures ?? []).map((f) => ({
        label: (f.label as string) ?? "Post",
        error: (f.error as string) ?? "Unknown error",
      })),
    };
  });

export const cancelMetricsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("metric_jobs")
      .update({ cancel_requested: true })
      .eq("id", data.jobId);
    return { ok: true };
  });

export const dismissMetricsJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("metric_jobs").delete().eq("id", data.jobId);
    return { ok: true };
  });

/**
 * Processes one batch of the oldest running job. The builder calls this on a
 * loop so progress never depends on a fire-and-forget self-request (which the
 * serverless runtime can drop as soon as the response is sent).
 */
export const runMetricsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { processJob } = await import("@/lib/report-metrics-worker.server");
    const result = await processJob();
    return {
      claimed: result.claimed,
      remaining: "remaining" in result ? result.remaining : 0,
    };
  });

