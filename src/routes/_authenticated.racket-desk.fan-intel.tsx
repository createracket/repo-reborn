import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Ear,
  Heart,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fanClusters,
  recentComments,
  sentimentBreakdown,
  sentimentColor,
  type ArtistFocus,
  type Sentiment,
} from "@/lib/racket-desk/fan-intel";

export const Route = createFileRoute("/_authenticated/racket-desk/fan-intel")({
  head: () => ({
    meta: [
      { title: "Fan intel · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FanIntelPage,
});

function FanIntelPage() {
  const [artists, setArtists] = useState<ArtistFocus[]>([]);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Sentiment>("all");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("racket_desk_profiles")
        .select("id, platform, handle, regions")
        .order("created_at", { ascending: true });
      const mapped: ArtistFocus[] = (data ?? []).map((r) => ({
        id: r.id,
        name: `@${r.handle.replace(/^@/, "")}`,
        handle: `@${r.handle.replace(/^@/, "")}`,
        region: ((r.regions ?? [])[0] ?? "UK") as ArtistFocus["region"],
        platform: r.platform,
      }));
      setArtists(mapped);
      setArtistId((prev) => prev ?? mapped[0]?.id ?? null);
    })();
  }, []);

  const artist = artists.find((a) => a.id === artistId) ?? artists[0] ?? null;

  const comments = filter === "all" ? recentComments : recentComments.filter((c) => c.sentiment === filter);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Ear className="h-3 w-3" /> Fan intel
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
            What your fans are actually saying.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Sentiment on your posts, top phrases, and where the same fan clusters engage across other
            artists — so every comment section becomes an intel feed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {artists.length === 0 ? (
            <Link
              to="/racket-desk/profiles"
              className="inline-flex items-center gap-1 rounded-full border border-lime px-3 py-1.5 text-xs font-medium text-lime hover:bg-lime hover:text-primary-foreground"
            >
              Add profiles to track <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            artists.map((a) => {
              const active = a.id === artist?.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setArtistId(a.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? "border-lime bg-lime text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a.name} · {a.platform ?? a.region}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked profile" value={artist?.handle ?? "—"} hint={artist ? `${artist.platform ?? ""} · ${artist.region}` : "Add profiles in My profiles"} icon={MessageCircle} />
        <StatCard label="Net sentiment" value="—" hint="run a listening scan to populate" icon={Heart} accent="lime" />
        <StatCard label="Week over week" value="—" hint="run a listening scan to populate" icon={TrendingUp} accent="lime" />
        <StatCard label="Fan clusters mapped" value={String(fanClusters.length)} hint="grouped by comment DNA" icon={Users} />
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SectionTitle>Sentiment breakdown</SectionTitle>
          <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-5">
            {sentimentBreakdown.map((b) => (
              <button
                key={b.sentiment}
                onClick={() => setFilter((f) => (f === b.sentiment ? "all" : b.sentiment))}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  filter === b.sentiment ? "border-lime bg-secondary" : "border-border bg-background/40 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-medium ${sentimentColor[b.sentiment]}`}>{b.label}</span>
                    <span className="font-display text-base">{b.share}%</span>
                  </div>
                  <span className={`text-[11px] font-medium ${b.delta >= 0 ? "text-lime" : "text-blush"}`}>
                    {b.delta > 0 ? "+" : ""}{b.delta}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-lime" style={{ width: `${b.share}%` }} />
                </div>
                <p className="mt-2 text-[11px] italic text-muted-foreground">Top phrase: "{b.topPhrase}"</p>
              </button>
            ))}
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Comments feed</SectionTitle>
            <span className="text-xs text-muted-foreground">Showing {comments.length} · click a sentiment to filter</span>
          </div>
          <div className="mt-3 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">{c.avatar}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.handle}</span>
                    <span>·</span>
                    <span>{c.post}</span>
                    <span>·</span>
                    <span>{c.when}</span>
                    <span className={`ml-auto inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium ${sentimentColor[c.sentiment]}`}>{c.sentiment}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{c.text}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {c.likes}</span>
                    <span>{c.platform}</span>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No comments in this bucket right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <div>
            <SectionTitle>Fan clusters · cross-artist engagement</SectionTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Same fans, mapped across TikTok, Instagram and YouTube. Where they engage next tells you what to make.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {fanClusters.map((cluster) => (
            <div key={cluster.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg">{cluster.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cluster.size.toLocaleString()} fans ·{" "}
                    <span className={`rounded-full border px-1.5 py-0.5 ${sentimentColor[cluster.topSentiment]}`}>{cluster.topSentiment}</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{cluster.vibe}</p>

              <div className="mt-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Also engaging with</div>
                <ul className="mt-2 space-y-2">
                  {cluster.alsoEngagingWith.map((o) => (
                    <li key={o.artist} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{o.artist}</span>
                        <span className="text-[11px] text-muted-foreground">{o.platform} · {o.overlap}% overlap</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{o.signal}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <div className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-lime">
                  <Sparkles className="h-3 w-3" /> Content hooks that land
                </div>
                <ul className="mt-2 space-y-1.5">
                  {cluster.hooks.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Demo intel · plug in your TikTok / IG / YouTube accounts on the Profiles page to swap this for your own fans.
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function StatCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string; hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "lime" | "blush";
}) {
  const accentClass = accent === "lime" ? "text-lime" : accent === "blush" ? "text-blush" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${accentClass}`} />
      </div>
      <div className={`mt-2 font-display text-2xl ${accentClass}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
