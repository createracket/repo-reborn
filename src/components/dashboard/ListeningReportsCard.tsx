import { useEffect, useState } from "react";
import { FileText, ExternalLink } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listDashboardReports,
  type DashboardReport,
} from "@/lib/racket-desk/report-sharing.functions";

export function ListeningReportsCard() {
  const [reports, setReports] = useState<DashboardReport[]>([]);

  useEffect(() => {
    listDashboardReports()
      .then(setReports)
      .catch(() => setReports([]));
  }, []);

  if (reports.length === 0) return null;

  return (
    <Card className="border-pink-accent">
      <CardHeader>
        <CardTitle className="font-display text-2xl flex items-center gap-2">
          <FileText className="size-5 text-primary" /> Listening reports
        </CardTitle>
        <CardDescription>
          Social listening insights shared with you by the Create Racket team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((r) => (
          <details key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 font-medium">
                {r.report_title || r.artist_name}
              </span>
              <span className="text-xs text-muted-foreground">
                @{r.handle} · {new Date(r.created_at).toLocaleDateString("en-GB")}
              </span>
            </summary>

            {r.notes && <p className="mt-3 text-sm text-muted-foreground">{r.notes}</p>}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <List title="What's working" items={r.analysis?.whatsWorking ?? []} />
              <List title="Fan signals" items={r.analysis?.fanSignals ?? []} />
            </div>

            {(r.analysis?.futureIdeas?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-xl border border-primary/40 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Make next</div>
                <ul className="mt-2 space-y-2">
                  {r.analysis.futureIdeas.map((i) => (
                    <li key={i.title}>
                      <div className="text-sm font-medium">{i.title}</div>
                      <div className="text-xs text-muted-foreground">{i.why}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(r.analysis?.topPosts?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {r.analysis.topPosts.slice(0, 3).map((p) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" /> Top post
                  </a>
                ))}
              </div>
            )}
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm">
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
