import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTrafficStats, type TrafficRange, type TrafficStats } from "@/lib/traffic-admin.functions";

const RANGES: { value: TrafficRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export function TrafficAdmin() {
  const fetchStats = useServerFn(getTrafficStats);
  const [range, setRange] = useState<TrafficRange>("7d");
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStats({ data: { range } })
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load traffic stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Traffic</h2>
          <p className="text-sm text-muted-foreground">
            First-party pageviews. No cookies, no third-party scripts. A "visitor" is a unique browser session.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-background p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded px-3 py-1 text-sm transition ${
                range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pageviews" value={stats.totals.pageviews.toLocaleString()} />
            <Stat label="Visitors" value={stats.totals.visitors.toLocaleString()} />
            <Stat
              label="Bounce rate"
              value={`${Math.round(stats.totals.bounceRate * 100)}%`}
              hint="Sessions with only one pageview"
            />
            <Stat
              label="Pages / session"
              value={stats.totals.avgPagesPerSession.toFixed(2)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily activity</CardTitle>
              <CardDescription>Pageviews (bar) and visitors (line) per day.</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyChart data={stats.daily} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top pages</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedList
                  rows={stats.topPages.map((r) => ({ label: r.path, value: r.views }))}
                  empty="No pageviews recorded yet."
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top referrers</CardTitle>
                <CardDescription>Where visitors came from (direct traffic excluded).</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedList
                  rows={stats.topReferrers.map((r) => ({ label: r.referrer, value: r.views }))}
                  empty="No external referrers yet."
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function RankedList({ rows, empty }: { rows: { label: string; value: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="relative overflow-hidden rounded-md border border-border/60 bg-muted/30">
          <div
            className="absolute inset-y-0 left-0 bg-primary/15"
            style={{ width: `${(r.value / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
            <span className="truncate font-mono text-xs">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{r.value}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ data }: { data: TrafficStats["daily"] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data.</p>;
  const max = Math.max(...data.map((d) => d.pageviews), 1);
  const visMax = Math.max(...data.map((d) => d.visitors), 1);

  return (
    <div className="space-y-2">
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${(d.pageviews / max) * 100}%` }}
              title={`${d.date} · ${d.pageviews} views · ${d.visitors} visitors`}
            />
            <div
              className="absolute bottom-0 h-1 w-full rounded-full bg-accent-foreground/60"
              style={{ bottom: `${(d.visitors / visMax) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
