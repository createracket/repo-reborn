import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listeningAnalysisSchema, type CampaignListeningReport } from "@/lib/campaign-listening";
import { formatCount } from "@/lib/youtube-utils";

export function ReportListeningSection({ slug, refreshTick }: { slug: string; refreshTick: number }) {
  const [reports, setReports] = useState<CampaignListeningReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [disclaimer, setDisclaimer] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.rpc("get_campaign_report_listening", { _slug: slug }),
      supabase.rpc("get_campaign_listening_disclaimer", { _slug: slug }),
    ]).then(([{ data, error }, copy]) => {
      if (cancelled) return;
      setError(!!error || !!copy.error);
      setDisclaimer(copy.data ?? "");
      setReports((data ?? []).map((report) => ({ ...report, analysis: listeningAnalysisSchema.parse(report.analysis ?? {}) })));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [slug, refreshTick]);
  return <section className="mt-8 space-y-10">
    {!loading && !error && disclaimer && <p className="whitespace-pre-wrap break-words border-l-2 border-border pl-4 text-sm text-muted-foreground">{disclaimer}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading listening reports…</p> : error ? <p role="alert" className="text-sm text-destructive">Listening reports could not be loaded.</p> : !reports.length ? <p className="text-sm text-muted-foreground">No listening reports published yet.</p> : reports.map((report) => <article key={report.id} className="border-b border-border pb-8">
      <h2 className="font-display text-2xl">{report.report_title || report.artist_name}</h2><p className="mt-1 text-sm text-muted-foreground">@{report.handle} · {report.platform} · {new Date(report.created_at).toLocaleDateString("en-AU")}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2"><Signals title="What's working" items={report.analysis.whatsWorking} /><Signals title="Fan signals" items={report.analysis.fanSignals} /></div>
      {report.analysis.futureIdeas.length > 0 && <div className="mt-6 rounded-lg border border-border p-5"><h3 className="text-sm font-semibold text-purple-soft">MAKE NEXT (MAYBE)</h3><ul className="mt-3 space-y-3">{report.analysis.futureIdeas.map((idea, i) => <li key={i}><p className="text-sm font-medium">{idea.title}</p><p className="text-sm text-muted-foreground">{idea.why}</p></li>)}</ul></div>}
      {report.analysis.topPosts.length > 0 && <div className="mt-6 rounded-lg border border-border p-5"><h3 className="text-sm font-semibold">Top content</h3><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{report.analysis.topPosts.map((post, i) => <div key={i} className="border-t border-border pt-4"><p className="line-clamp-4 text-sm">{post.caption || "Social post"}</p><p className="mt-3 text-xs text-muted-foreground">{post.keySentimentDriver}</p><p className="mt-3 text-xs text-muted-foreground">{formatCount(post.views)} views · {formatCount(post.likes)} likes · {formatCount(post.commentsCount)} comments</p><a href={post.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-purple-soft hover:underline"><ExternalLink className="size-3" />Content</a></div>)}</div></div>}
    </article>)}
  </section>;
}
function Signals({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="rounded-lg border border-border p-5"><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>;
}