import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ear, ExternalLink, Loader2, Trash2, Sparkles, Bookmark, BookmarkCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  runSocialListening,
  listSocialListeningScans,
  deleteSocialListeningScan,
  saveSocialListeningScan,
  type ListeningAnalysis,
  type ScannedPost,
} from "@/lib/racket-desk/social-listening.functions";

export const Route = createFileRoute("/_authenticated/racket-desk/social-listening")({
  head: () => ({
    meta: [
      { title: "Social listening · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SocialListeningPage,
});

type Scan = {
  id: string;
  artist_name: string;
  handle: string;
  platform: string;
  posts: ScannedPost[];
  analysis: ListeningAnalysis;
  created_at: string;
  saved?: boolean;
  report_title?: string | null;
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function SocialListeningPage() {
  const [artistName, setArtistName] = useState("");
  const [handle, setHandle] = useState("");
  const [limit, setLimit] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Scan | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setScans((await listSocialListeningScans({ data: { savedOnly: false } })) as Scan[]);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  async function run() {
    if (!artistName.trim() || !handle.trim()) {
      setError("Add an artist name and an Instagram handle.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await runSocialListening({
        data: { artistName: artistName.trim(), handle: handle.trim(), limit },
      });
      if (!res.ok || !res.analysis) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      const scan: Scan = {
        id: res.scanId ?? "new",
        artist_name: res.artistName ?? artistName,
        handle: res.handle ?? handle,
        platform: "Instagram",
        posts: res.posts ?? [],
        analysis: res.analysis,
        created_at: new Date().toISOString(),
        saved: false,
      };
      setCurrent(scan);
      setScans((s) => [scan, ...s]);
      toast.success("Listening complete");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteSocialListeningScan({ data: { id } });
      setScans((s) => s.filter((x) => x.id !== id));
      if (current?.id === id) setCurrent(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete scan");
    }
  }

  async function toggleSave(scan: Scan, saved: boolean) {
    if (!scan.id || scan.id === "new") {
      toast.error("This scan couldn't be stored — run it again.");
      return;
    }
    try {
      await saveSocialListeningScan({ data: { id: scan.id, saved } });
      setScans((s) => s.map((x) => (x.id === scan.id ? { ...x, saved } : x)));
      setCurrent((c) => (c && c.id === scan.id ? { ...c, saved } : c));
      toast.success(saved ? "Saved to reports" : "Removed from reports");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save this scan");
    }
  }

  const a = current?.analysis;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-lime">
        <Ear className="h-3.5 w-3.5" /> Social listening
      </div>
      <h1 className="mt-2 font-display text-3xl tracking-tight">What's landing for an artist</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pull an artist's recent Instagram reels, rank them by engagement, and get a read on the
        formats that work plus ideas for what to make next.
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Artist name"
          className="rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
        />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Instagram handle or URL"
          className="rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
        />
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
        >
          {[10, 20, 30, 50].map((n) => (
            <option key={n} value={n}>
              {n} posts
            </option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-lime px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Listening…" : "Run listening"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}

      {a && current && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">Top content · @{current.handle}</h2>
              <button
                onClick={() => toggleSave(current, !current.saved)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  current.saved
                    ? "border-lime bg-lime text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {current.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {current.saved ? "Saved to reports" : "Save to reports"}
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {a.topPosts.map((p) => (
                <article key={p.url} className="flex flex-col rounded-2xl border border-border bg-card p-4">
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

            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Hide" : "Show"} all {current.posts.length} scanned posts
            </button>
            {showAll && (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Post</th>
                      <th className="px-3 py-2">Views</th>
                      <th className="px-3 py-2">Likes</th>
                      <th className="px-3 py-2">Comments</th>
                      <th className="px-3 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.posts.map((p) => (
                      <tr key={p.url} className="border-t border-border">
                        <td className="max-w-xs truncate px-3 py-2">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-lime">
                            {p.caption || p.url}
                          </a>
                        </td>
                        <td className="px-3 py-2">{fmt(p.views)}</td>
                        <td className="px-3 py-2">{fmt(p.likes)}</td>
                        <td className="px-3 py-2">{fmt(p.commentsCount)}</td>
                        <td className="px-3 py-2 text-lime">{fmt(p.engagementScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Panel title="What's working" items={a.whatsWorking} />
            <Panel title="Fan signals" items={a.fanSignals} />
            <div className="rounded-2xl border border-lime/40 bg-card p-5">
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
          </aside>
        </div>
      )}

      {scans.length > 0 && (
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Recent scans</h2>
            <Link to="/racket-desk/reports" className="text-xs text-lime hover:underline">
              View saved reports →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {scans.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <button className="min-w-0 flex-1 text-left hover:text-lime" onClick={() => setCurrent(s)}>
                  <span className="font-semibold">{s.artist_name}</span>{" "}
                  <span className="text-muted-foreground">@{s.handle}</span>
                </button>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("en-GB")}
                </span>
                <button
                  onClick={() => toggleSave(s, !s.saved)}
                  aria-label={s.saved ? "Remove from reports" : "Save to reports"}
                  className={s.saved ? "text-lime" : "text-muted-foreground hover:text-foreground"}
                >
                  {s.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => remove(s.id)}
                  aria-label="Delete scan"
                  className="text-muted-foreground hover:text-coral"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
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
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
