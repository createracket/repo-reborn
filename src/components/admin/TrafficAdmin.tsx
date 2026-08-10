import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrafficStats, type TrafficRange, type TrafficFilter, type TrafficStats } from "@/lib/traffic-admin.functions";

const RANGES: { value: TrafficRange; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const FILTERS: { value: TrafficFilter; label: string; hint: string }[] = [
  { value: "humans", label: "Humans", hint: "Real visitors only" },
  { value: "bots", label: "Bots", hint: "Crawlers & scrapers" },
  { value: "all", label: "All", hint: "Everything" },
];

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", AU: "Australia", CN: "China",
  DE: "Germany", FR: "France", NL: "Netherlands", CA: "Canada", IN: "India",
  JP: "Japan", BR: "Brazil", MX: "Mexico", IE: "Ireland", ES: "Spain",
  IT: "Italy", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
  PL: "Poland", RU: "Russia", SG: "Singapore", HK: "Hong Kong", KR: "South Korea",
};

function countryLabel(code: string) {
  if (code === "Unknown") return "Unknown";
  return `${code} · ${COUNTRY_NAMES[code] ?? code}`;
}

export function TrafficAdmin() {
  const fetchStats = useServerFn(getTrafficStats);
  const [range, setRange] = useState<TrafficRange>("7d");
  const [filter, setFilter] = useState<TrafficFilter>("humans");
  const [includeSelf, setIncludeSelf] = useState(false);
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStats({ data: { range, filter, includeSelf, tzOffsetMinutes: new Date().getTimezoneOffset() } })
      .then((res) => { if (!cancelled) setStats(res); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? "Failed to load traffic stats"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, filter, includeSelf, fetchStats]);


  const totalAll = stats ? stats.totals.humanPageviews + stats.totals.botPageviews : 0;
  const botShare = totalAll > 0 && stats ? Math.round((stats.totals.botPageviews / totalAll) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Traffic</h2>
          <p className="text-sm text-muted-foreground">
            First-party pageviews. No cookies, no third-party scripts. Bots flagged server-side via user-agent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl<TrafficFilter>
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label, title: f.hint }))}
          />
          <SegmentedControl<TrafficRange>
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          />
          <SegmentedControl<"exclude" | "include">
            value={includeSelf ? "include" : "exclude"}
            onChange={(v) => setIncludeSelf(v === "include")}
            options={[
              { value: "exclude", label: "Exclude me", title: "Hide your own admin browsing" },
              { value: "include", label: "Include me", title: "Show your own admin browsing" },
            ]}
          />
        </div>
      </div>

      {stats && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <span className="text-muted-foreground">
              In this period: <strong className="text-foreground">{stats.totals.humanPageviews.toLocaleString()}</strong> human ·{" "}
              <strong className="text-foreground">{stats.totals.botPageviews.toLocaleString()}</strong> bot pageviews ({botShare}% bots)
              {!stats.includeSelf && stats.excludedSelfPageviews > 0 && (
                <> · <strong className="text-foreground">{stats.excludedSelfPageviews.toLocaleString()}</strong> of your own views excluded</>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              Showing: <strong className="text-foreground">{FILTERS.find((f) => f.value === filter)?.label}</strong>
            </span>

          </CardContent>
        </Card>
      )}

      {error && (
        <Card><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>
      )}

      {loading && !stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pageviews" value={stats.totals.pageviews.toLocaleString()} />
            <Stat label="Visitors" value={stats.totals.visitors.toLocaleString()} />
            <Stat label="Bounce rate" value={`${Math.round(stats.totals.bounceRate * 100)}%`} hint="Sessions with only one pageview" />
            <Stat label="Pages / session" value={stats.totals.avgPagesPerSession.toFixed(2)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily activity</CardTitle>
              <CardDescription>Pageviews per day for the selected filter.</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyChart data={stats.daily} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Countries</CardTitle>
                <CardDescription>Where traffic comes from (via edge headers). Human vs bot split shown.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topCountries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No country data yet. New pageviews will be tagged from now on.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {stats.topCountries.map((c) => {
                      const max = Math.max(...stats.topCountries.map((x) => x.views), 1);
                      const suspicious = c.bots > c.humans && c.views > 3;
                      return (
                        <li key={c.country} className="relative overflow-hidden rounded-md border border-border/60 bg-muted/30">
                          <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${(c.views / max) * 100}%` }} />
                          <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
                            <span className="truncate">
                              {countryLabel(c.country)}
                              {suspicious && (
                                <span className="ml-2 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                                  Mostly bots
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                              {c.humans}h · {c.bots}b
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bot sources</CardTitle>
                <CardDescription>What the flagged bots actually are. Most are harmless crawlers.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedList
                  rows={stats.topBotReasons.map((r) => ({ label: r.reason, value: r.views }))}
                  empty={filter === "humans" ? "Switch the filter to Bots or All to see bot sources." : "No bot traffic in this period."}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top pages</CardTitle></CardHeader>
              <CardContent>
                <RankedList rows={stats.topPages.map((r) => ({ label: r.path, value: r.views }))} empty="No pageviews recorded yet." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top referrers</CardTitle>
                <CardDescription>Where visitors came from (direct excluded).</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedList rows={stats.topReferrers.map((r) => ({ label: r.referrer, value: r.views }))} empty="No external referrers yet." />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string; title?: string }[] }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm transition ${
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
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
          <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${(r.value / max) * 100}%` }} />
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
  return (
    <div className="space-y-2">
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${(d.pageviews / max) * 100}%` }}
              title={`${d.date} · ${d.pageviews} views · ${d.visitors} visitors · ${d.bots} bot`}
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
