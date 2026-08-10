import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listSocialListeningScans,
  saveSocialListeningScan,
  type ListeningAnalysis,
  type ScannedPost,
} from "@/lib/racket-desk/social-listening.functions";
import { ReportDashboardShare } from "@/components/racket-desk/ReportDashboardShare";

export const Route = createFileRoute("/_authenticated/racket-desk/reports")({
  head: () => ({
    meta: [
      { title: "Listening reports · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

type Scan = {
  id: string;
  artist_name: string;
  handle: string;
  platform: string;
  posts: ScannedPost[];
  analysis: ListeningAnalysis;
  created_at: string;
  saved: boolean;
  report_title: string | null;
  notes: string | null;
  dashboard_visible: boolean;
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<Scan[]>([]);
  const [artist, setArtist] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        setScans((await listSocialListeningScans({ data: { savedOnly: true } })) as Scan[]);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const artists = Array.from(new Set(scans.map((s) => s.artist_name))).sort();
  const visible = artist === "all" ? scans : scans.filter((s) => s.artist_name === artist);

  async function unsave(id: string) {
    try {
      await saveSocialListeningScan({ data: { id, saved: false } });
      setScans((s) => s.filter((x) => x.id !== id));
      toast.success("Removed from reports");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove report");
    }
  }

  async function saveMeta(id: string, reportTitle: string, notes: string) {
    try {
      await saveSocialListeningScan({ data: { id, saved: true, reportTitle, notes } });
      setScans((s) =>
        s.map((x) => (x.id === id ? { ...x, report_title: reportTitle, notes } : x)),
      );
      toast.success("Report updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update report");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-lime">
        <FileText className="h-3.5 w-3.5" /> Reports
      </div>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Saved listening reports</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every social listening search you've saved, across all artists. Add a title and notes to
        turn a scan into a working strategy doc.
      </p>

      {artists.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-1.5 text-xs">
          {["all", ...artists].map((a) => (
            <button
              key={a}
              onClick={() => setArtist(a)}
              className={`rounded-full border px-3 py-1.5 transition ${
                artist === a
                  ? "border-lime bg-lime font-semibold text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {a === "all" ? "All artists" : a}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          No saved reports yet. Run a scan on{" "}
          <Link to="/racket-desk/social-listening" className="text-lime hover:underline">
            Social listening
          </Link>{" "}
          and hit “Save to reports”.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {visible.map((s) => (
            <ReportCard key={s.id} scan={s} onUnsave={unsave} onSaveMeta={saveMeta} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  scan,
  onUnsave,
  onSaveMeta,
}: {
  scan: Scan;
  onUnsave: (id: string) => void;
  onSaveMeta: (id: string, title: string, notes: string) => void;
}) {
  const [title, setTitle] = useState(scan.report_title ?? "");
  const [notes, setNotes] = useState(scan.notes ?? "");
  const a = scan.analysis;

  return (
    <details className="group rounded-2xl border border-border bg-card open:pb-5">
      <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 text-sm">
        <span className="min-w-0 flex-1">
          <span className="font-display text-base">{scan.report_title || scan.artist_name}</span>{" "}
          <span className="text-muted-foreground">@{scan.handle}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {scan.platform} · {new Date(scan.created_at).toLocaleDateString("en-GB")} ·{" "}
          {scan.posts.length} posts
        </span>
        <button
          onClick={(e) => {
            e.preventDefault();
            onUnsave(scan.id);
          }}
          aria-label="Remove from reports"
          className="text-muted-foreground hover:text-coral"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </summary>

      <div className="grid gap-6 px-5 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Top content
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {a.topPosts.map((p) => (
              <article key={p.url} className="flex flex-col rounded-xl border border-border p-4">
                <div className="text-xs font-semibold text-lime">{p.sentimentScore}</div>
                <p className="mt-2 line-clamp-3 text-sm">{p.caption || "No caption"}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Views</dt>
                    <dd>{fmt(p.views)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Likes</dt>
                    <dd>{fmt(p.likes)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Comments</dt>
                    <dd>{fmt(p.commentsCount)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">{p.keySentimentDriver}</p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-lime hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View post
                </a>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title (optional)"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
            />
            <div className="flex items-center">
              <button
                onClick={() => onSaveMeta(scan.id, title, notes)}
                className="rounded-full bg-lime px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Save notes
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your notes on this artist / strategy…"
              className="sm:col-span-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-lime focus:outline-none"
            />
          </div>
        </section>

        <aside className="space-y-4">
          <ReportDashboardShare scanId={scan.id} initialVisible={!!scan.dashboard_visible} />
          <Panel title="What's working" items={a.whatsWorking} />
          <Panel title="Fan signals" items={a.fanSignals} />
          {a.futureIdeas.length > 0 && (
            <div className="rounded-2xl border border-lime/40 p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-lime">Make next</div>
              <ul className="mt-3 space-y-3">
                {a.futureIdeas.map((i) => (
                  <li key={i.title}>
                    <div className="text-sm font-semibold">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{i.why}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </details>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
