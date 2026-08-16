import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";

import {
  getListeningReport,
  type ListeningReportDetail,
} from "@/lib/racket-desk/report-sharing.functions";

export const Route = createFileRoute("/_authenticated/listening-report/$id")({
  head: () => ({
    meta: [
      { title: "Listening report · Create Racket" },
      { name: "description", content: "Social listening insights shared with you by Create Racket." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Listening report · Create Racket" },
      { property: "og:description", content: "Social listening insights shared with you by Create Racket." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListeningReportPage,
});

function ListeningReportPage() {
  const { id } = Route.useParams();
  const [report, setReport] = useState<ListeningReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getListeningReport({ data: { id } })
      .then((r) => {
        if (!cancelled) setReport(r as ListeningReportDetail | null);
      })
      .catch(() => setReport(null))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading report…
        </div>
      ) : !report ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          This report isn't available to you.
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-start gap-4">
            {report.thumbnail_url ? (
              <img
                src={report.thumbnail_url}
                alt=""
                className="size-20 shrink-0 rounded-xl object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                <FileText className="size-3.5" /> Listening report
              </div>
              <h1 className="mt-2 font-display text-3xl tracking-tight">
                {report.report_title || report.artist_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                @{report.handle} · {report.platform} ·{" "}
                {new Date(report.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>

          {report.notes ? (
            <p className="mt-6 max-w-3xl text-sm text-muted-foreground">{report.notes}</p>
          ) : null}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Panel title="What's working" items={report.analysis?.whatsWorking ?? []} />
            <Panel title="Fan signals" items={report.analysis?.fanSignals ?? []} />
          </div>

          {(report.analysis?.futureIdeas?.length ?? 0) > 0 && (
            <div className="mt-6 rounded-2xl border border-primary/40 p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Make next</div>
              <ul className="mt-3 space-y-3">
                {report.analysis.futureIdeas.map((i) => (
                  <li key={i.title}>
                    <div className="text-sm font-semibold">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{i.why}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(report.analysis?.topPosts?.length ?? 0) > 0 && (
            <section className="mt-8">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Top content
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {report.analysis.topPosts.map((p) => (
                  <article key={p.url} className="flex flex-col rounded-xl border border-border p-4">
                    <p className="line-clamp-3 text-sm">{p.caption || "No caption"}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{p.keySentimentDriver}</p>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" /> View post
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
