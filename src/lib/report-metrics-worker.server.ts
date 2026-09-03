import { scrapePostMetricsRaw } from "@/lib/campaign-scrapers.functions";

const CONCURRENCY = 4;
/** Max items processed per invocation — keeps each request inside the worker limit. */
const BATCH = 8;
const ITEM_TIMEOUT_MS = 60_000;
/** Lease length: another invocation won't touch the job while it's held. */
const LEASE_MS = 3 * 60_000;

type Item = {
  id: string;
  post_id: string;
  post_url: string | null;
  label: string | null;
  attempts: number;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms)),
  ]);
}

export async function processJob() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();

  // Single-flight: claim the oldest running job whose lease has expired.
  const { data: candidate } = await supabaseAdmin
    .from("metric_jobs")
    .select("id, report_id, total, done, failed, cancel_requested, lease_until, notify_email, started_at")
    .eq("status", "running")
    .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) return { claimed: false as const };

  const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
  const { data: claimed } = await supabaseAdmin
    .from("metric_jobs")
    .update({ lease_until: leaseUntil })
    .eq("id", candidate.id)
    .eq("status", "running")
    .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
    .select("id")
    .maybeSingle();
  if (!claimed) return { claimed: false as const };

  const job = candidate;

  if (job.cancel_requested) {
    await supabaseAdmin
      .from("metric_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString(), lease_until: null })
      .eq("id", job.id);
    return { claimed: true as const, jobId: job.id, processed: 0, remaining: 0 };
  }

  // Recover items orphaned by an interrupted invocation (navigation, timeout).
  await supabaseAdmin
    .from("metric_job_items")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("job_id", job.id)
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - STALE_ITEM_MS).toISOString());

  const { data: pending } = await supabaseAdmin
    .from("metric_job_items")
    .select("id, post_id, post_url, label, attempts")
    .eq("job_id", job.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);

  const items = (pending ?? []) as Item[];
  let done = 0;
  let failed = 0;

  async function runItem(item: Item) {
    await supabaseAdmin
      .from("metric_job_items")
      .update({ status: "running", attempts: item.attempts + 1 })
      .eq("id", item.id);
    try {
      const url = item.post_url ?? "";
      const result = await withTimeout(scrapePostMetricsRaw(url), ITEM_TIMEOUT_MS);
      if (!result.ok) throw new Error(result.error);

      const m = result.metrics;
      const patch: Partial<{
        views: number;
        likes: number;
        comments: number;
        shares: number;
        saves: number;
        followers: number;
        posted_at: string;
        caption: string;
        hashtags: string[];
        thumbnail_url: string;
        metrics_updated_at: string;
      }> = { metrics_updated_at: new Date().toISOString() };
      if (m.views != null) patch.views = m.views;
      if (m.likes != null) patch.likes = m.likes;
      if (m.comments != null) patch.comments = m.comments;
      if (m.shares != null) patch.shares = m.shares;
      if (m.saves != null) patch.saves = m.saves;
      if (m.followers != null) patch.followers = m.followers;
      if (m.posted_at) patch.posted_at = m.posted_at;
      if (m.caption) patch.caption = m.caption;
      if (m.hashtags?.length) patch.hashtags = m.hashtags;
      if (m.thumbnail_url) patch.thumbnail_url = m.thumbnail_url;

      const { error } = await supabaseAdmin
        .from("campaign_report_posts")
        .update(patch)
        .eq("id", item.post_id);
      if (error) throw new Error(error.message);

      await supabaseAdmin
        .from("metric_job_items")
        .update({ status: "done", error: null })
        .eq("id", item.id);
      done += 1;
    } catch (e) {
      const message = (e as Error).message ?? "Unknown error";
      // One retry before giving up.
      if (item.attempts + 1 < 2) {
        await supabaseAdmin
          .from("metric_job_items")
          .update({ status: "pending", error: message })
          .eq("id", item.id);
      } else {
        await supabaseAdmin
          .from("metric_job_items")
          .update({ status: "failed", error: message })
          .eq("id", item.id);
        failed += 1;
      }
    }
  }

  // Bounded concurrency.
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        await runItem(next);
      }
    }),
  );

  const { count: remaining } = await supabaseAdmin
    .from("metric_job_items")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id)
    .in("status", ["pending", "running"]);

  const totalDone = job.done + done;
  const totalFailed = job.failed + failed;
  const finished = (remaining ?? 0) === 0;

  await supabaseAdmin
    .from("metric_jobs")
    .update({
      done: totalDone,
      failed: totalFailed,
      lease_until: null,
      ...(finished
        ? { status: "complete", finished_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", job.id);

  if (finished && job.notify_email) {
    try {
      const [{ enqueueTransactionalEmail }, report] = await Promise.all([
        import("@/lib/email/send.server"),
        supabaseAdmin
          .from("campaign_reports")
          .select("title, slug")
          .eq("id", job.report_id)
          .maybeSingle(),
      ]);
      const { data: failList } = await supabaseAdmin
        .from("metric_job_items")
        .select("label, error")
        .eq("job_id", job.id)
        .eq("status", "failed")
        .limit(25);
      const mins = Math.max(
        1,
        Math.round((Date.now() - new Date(job.started_at).getTime()) / 60000),
      );
      await enqueueTransactionalEmail({
        templateName: "metrics-update-complete",
        recipientEmail: job.notify_email,
        templateData: {
          reportTitle: report.data?.title ?? "Campaign report",
          reportUrl: report.data?.slug
            ? `https://createracket.com/report/${report.data.slug}`
            : "",
          total: job.total,
          done: totalDone,
          failed: totalFailed,
          durationLabel: `${mins} minute${mins === 1 ? "" : "s"}`,
          failures: (failList ?? [])
            .map((f) => `${f.label ?? "Post"} — ${f.error ?? "Unknown error"}`)
            .join("\n"),
        },
        idempotencyKey: `metrics-job-${job.id}`,
      });
    } catch (e) {
      console.error("[metrics-worker] summary email failed", e);
    }
  }

  return {
    claimed: true as const,
    jobId: job.id,
    processed: items.length,
    remaining: remaining ?? 0,
  };
}

