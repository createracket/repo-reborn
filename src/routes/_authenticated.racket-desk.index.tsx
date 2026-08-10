import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bookmark,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  Search,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trends, stats, type Trend } from "@/lib/racket-desk/trends";

export const Route = createFileRoute("/_authenticated/racket-desk/")({
  head: () => ({
    meta: [
      { title: "Today · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

const platformDot: Record<Trend["platform"], string> = {
  TikTok: "bg-lime",
  Instagram: "bg-coral",
  YouTube: "bg-white",
};

function Dashboard() {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-lime">Morning brief · {dateLabel}</div>
          <h1 className="mt-2 font-display text-3xl tracking-tight">
            Six formats worth making <span className="text-lime">today</span>.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search sounds, hooks, artists…"
              className="w-56 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-lime focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Trends today" value={stats.trendsToday} accent="lime" hint={`Refreshed ${stats.refreshedMinutesAgo}m ago`} />
        <StatCard label="Breaking now" value={12} accent="coral" hint="Rising in last 6h" />
        <StatCard label="Watchlist hits" value={4} hint="Match your artists" />
        <StatCard label="Ideas drafted" value={7} hint="Waiting in inbox" />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader
            eyebrow="Trend feed"
            title="Breaking right now"
            filters={["All", "TikTok", "Instagram", "YouTube", "Music", "Culture"]}
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {trends.map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <DailyIdeaPromo />
          <RegionsPulse />
        </aside>
      </div>
    </div>
  );
}

function DailyIdeaPromo() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-lime/40 bg-card p-5">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-lime">
        <Wand2 className="h-3 w-3" /> Daily idea
      </div>
      <h3 className="mt-4 font-display text-lg leading-snug">One shootable idea, every day.</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Link your TikTok, IG and YouTube handles. Racket serves a fresh, on-trend content brief tuned
        to your audience.
      </p>
      <Link
        to="/racket-desk/profiles"
        className="mt-4 inline-flex items-center gap-1 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        Set up my profiles <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "lime" | "coral";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-3xl ${
          accent === "lime" ? "text-lime" : accent === "coral" ? "text-coral" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  filters,
}: {
  eyebrow: string;
  title: string;
  filters?: string[];
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div>
        <h2 className="mt-1 font-display text-2xl tracking-tight">{title}</h2>
      </div>
      {filters && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`rounded-full border px-3 py-1.5 ${
                i === 0
                  ? "border-lime bg-lime text-primary-foreground font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendCard({ trend }: { trend: Trend }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-lime/50">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 pb-3 pt-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
          <span className={`h-1.5 w-1.5 rounded-full ${platformDot[trend.platform]}`} />
          <span className="font-medium">{trend.platform}</span>
          <span className="text-muted-foreground">· {trend.region}</span>
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{trend.creator}</span>
        {trend.isNew && (
          <span className="rounded-sm bg-coral/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            new
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">

        <h3 className="font-display text-lg leading-snug">{trend.title}</h3>
        <div className="mt-1 text-sm text-muted-foreground">{trend.format}</div>
        <p className="mt-3 text-sm italic text-foreground/80">"{trend.hookLine}"</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Audience</dt>
            <dd className="mt-0.5">{trend.audience}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sound / hook</dt>
            <dd className="mt-0.5">{trend.soundOrHook}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-lime">
              <Flame className="h-3.5 w-3.5" /> {trend.heat}
            </span>
            <span className="text-muted-foreground">· {trend.velocity}</span>
          </div>
          <div className="text-xs text-muted-foreground">{trend.updated}</div>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-lime" style={{ width: `${trend.heat}%` }} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <CopyFormatDialog trend={trend} />
          <a
            href={trend.sources[0]?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            aria-label="See it live"
          >
            <ExternalLink className="h-3.5 w-3.5" /> See live
          </a>
          <button className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Save">
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function CopyFormatDialog({ trend }: { trend: Trend }) {
  const b = trend.breakdown;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-lime px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
          <Copy className="h-3.5 w-3.5" /> Copy format
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogDescription className="text-[11px] uppercase tracking-[0.2em] text-lime">
            {trend.platform} · {trend.region} · {trend.category}
          </DialogDescription>
          <DialogTitle className="font-display text-2xl leading-tight">{trend.title}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {trend.creator}
          </div>


          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <BreakdownRow label="Hook (0–3s)" value={b.hook} />
            <BreakdownRow label="Structure" value={b.structure} />
            <BreakdownRow label="Audio treatment" value={b.audio} />
            <BreakdownRow label="Caption / CTA" value={b.cta} />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Proof · live examples</div>
            <ul className="mt-2 space-y-2">
              {trend.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm hover:border-lime/60"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-lime" />
                      {s.label}
                    </span>
                    {s.plays && <span className="text-xs text-muted-foreground">{s.plays} plays</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Wand2 className="h-4 w-4" /> Draft angle for a roster artist
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm leading-snug">{value}</div>
    </div>
  );
}


function RegionsPulse() {
  const rows = [
    { code: "UK", label: "London · Manchester", pulse: 82 },
    { code: "US", label: "LA · NYC", pulse: 94 },
    { code: "AU", label: "Melbourne · Sydney", pulse: 68 },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Regions</div>
      <h3 className="mt-1 font-display text-lg">Regional pulse</h3>
      <ul className="mt-4 space-y-4">
        {rows.map((r) => (
          <li key={r.code}>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-display">{r.code}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.label}</span>
              </div>
              <div className="text-xs font-semibold text-lime">{r.pulse}</div>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-lime" style={{ width: `${r.pulse}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
