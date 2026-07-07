import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Users, BadgeCheck, ChevronDown, Filter } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type PublicRoster = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  header_image_url: string | null;
  hide_prospect_tags: boolean;
  est_engagement_pct: number | null;
};

type PublicItem = {
  id: string;
  kind: "profile" | "prospect";
  name: string;
  avatar_url: string | null;
  vibe: string | null;
  instagram_url: string | null;
  instagram_followers: number | null;
  tiktok_url: string | null;
  tiktok_followers: number | null;
  youtube_url: string | null;
  youtube_subscribers: number | null;
  spotify_url: string | null;
  spotify_monthly_listens: number | null;
  apple_music_url: string | null;
  apple_music_followers: number | null;
  example_video_url: string | null;
  bio_page_url: string | null;
  content_review_url: string | null;
  position: number;
  status: string;
  category: string | null;
  location: string | null;
};

const LOCATION_FLAG: Record<string, string> = { GB: "🇬🇧", US: "🇺🇸", NZ: "🇳🇿", AU: "🇦🇺" };
const LOCATION_LABEL: Record<string, string> = { GB: "UK", US: "USA", NZ: "New Zealand", AU: "Australia" };

const STATUS_LABEL: Record<string, string> = {
  in_review: "In Review",
  approved: "Approved",
  confirmed: "Confirmed",
  in_production: "In Production",
  briefed: "Briefed",
  contracting: "Contracting",
  live: "Live",
  hold: "Hold",
};

const CATEGORY_LABEL: Record<string, string> = {
  musician: "Musician",
  ugc: "UGC",
  egc: "EGC",
  music_fan: "Music Fan",
  artist_exchange: "Artist Exchange",
};

const STATUS_BADGE: Record<string, string> = {
  in_review: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  approved: "border-primary/40 bg-primary/10 text-primary",
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  in_production: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  briefed: "border-chart-5/40 bg-chart-5/10 text-chart-5",
  contracting: "border-purple/40 bg-purple/10 text-purple",
  live: "border-pink-accent/40 bg-pink-accent/10 text-pink-accent",
  hold: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};


export const Route = createFileRoute("/roster/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Roster — ${params.slug}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicRosterPage,
});

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}


type CategoryFilter = "all" | "musician" | "ugc" | "egc" | "music_fan" | "artist_exchange";

const FILTER_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "musician", label: "Musician" },
  { value: "ugc", label: "UGC" },
  { value: "egc", label: "EGC" },
  { value: "music_fan", label: "Music Fan" },
  { value: "artist_exchange", label: "Artist Exchange" },
];

function PublicRosterPage() {
  const { slug } = Route.useParams();
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    (async () => {
      const { data: r } = await (supabase as any)
        .from("public_rosters")
        .select(
          "id, title, description, slug, published, published_at, header_image_url, hide_prospect_tags, est_engagement_pct",
        )
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!r) {
        setStatus("missing");
        return;
      }
      const pr = r as unknown as PublicRoster;
      setRoster(pr);
      const { data: it } = await supabase
        .from("roster_items")
        .select(
          "id, kind, name, avatar_url, vibe, instagram_url, instagram_followers, tiktok_url, tiktok_followers, youtube_url, youtube_subscribers, spotify_url, spotify_monthly_listens, apple_music_url, apple_music_followers, example_video_url, bio_page_url, content_review_url, position, status, category, location",
        )
        .eq("roster_id", pr.id)
        .order("position", { ascending: true });
      setItems((it as unknown as PublicItem[]) ?? []);
      setStatus("ready");
    })();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading roster…</p>
        </main>
      </div>
    );
  }

  if (status === "missing" || !roster) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl">Roster not found</h1>
          <p className="mt-2 text-muted-foreground">
            This roster may be unpublished or doesn't exist.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const totalFollowers = items
    .filter((it) => it.status !== "hold")
    .reduce(
      (acc, it) =>
        acc +
        (it.instagram_followers ?? 0) +
        (it.tiktok_followers ?? 0) +
        (it.youtube_subscribers ?? 0) +
        (it.spotify_monthly_listens ?? 0) +
        (it.apple_music_followers ?? 0),
      0,
    );
  

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        {roster.header_image_url ? (
          <div
            className="mb-10 overflow-hidden rounded-2xl border border-border/60"
            style={{ aspectRatio: "16 / 9" }}
          >
            <img
              src={roster.header_image_url}
              alt={roster.title}
              className="size-full object-cover"
            />
          </div>
        ) : null}

        <Badge variant="outline" className="uppercase tracking-[0.2em]">
          <Users className="mr-1.5 size-3" /> Roster
        </Badge>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
          {roster.title}
        </h1>
        {roster.description && (
          <p className="mt-4 whitespace-pre-wrap text-lg text-muted-foreground">
            {roster.description}
          </p>
        )}

        {(totalFollowers > 0 || roster.est_engagement_pct != null) && (
          <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${roster.est_engagement_pct != null ? "lg:grid-cols-3" : ""}`}>
            {totalFollowers > 0 && (
              <>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Total followers
                    </p>
                    <p className="mt-1 font-display text-2xl">
                      {formatCount(totalFollowers)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Est. reach
                    </p>
                    <p className="mt-1 font-display text-2xl">
                      {formatCount(Math.round(totalFollowers * 0.4))}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            {roster.est_engagement_pct != null && (
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Est. engagement
                  </p>
                  <p className="mt-1 font-display text-2xl">
                    {roster.est_engagement_pct}%
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {(() => {
          const activeItems = items.filter((it) => it.status !== "hold" && (categoryFilter === "all" || it.category === categoryFilter));
          const archivedItems = items.filter((it) => it.status === "hold" && (categoryFilter === "all" || it.category === categoryFilter));

          const renderItem = (it: PublicItem) => {
            const stats: Array<[string, number | null, string | null]> = [
              ["IG", it.instagram_followers, it.instagram_url],
              ["TT", it.tiktok_followers, it.tiktok_url],
              ["YT", it.youtube_subscribers, it.youtube_url],
              ["Spotify streams", it.spotify_monthly_listens, it.spotify_url],
              ["Apple", it.apple_music_followers, it.apple_music_url],
            ];
            const totalReach =
              (it.instagram_followers ?? 0) +
              (it.tiktok_followers ?? 0) +
              (it.youtube_subscribers ?? 0) +
              (it.spotify_monthly_listens ?? 0) +
              (it.apple_music_followers ?? 0);
            const initials = it.name
              .split(/\s+/)
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const showProspect = it.kind === "prospect" && !roster.hide_prospect_tags;
            return (
              <Card key={it.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-base font-medium text-muted-foreground">
                      {it.avatar_url ? (
                        <img src={it.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span>{initials || "?"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl">{it.name}</h3>
                          {it.location && LOCATION_FLAG[it.location] && (
                            <span
                              className="text-lg leading-none"
                              title={LOCATION_LABEL[it.location]}
                              aria-label={LOCATION_LABEL[it.location]}
                            >
                              {LOCATION_FLAG[it.location]}
                            </span>
                          )}
                          {it.kind === "profile" ? (
                            <Badge className="gap-1 border-transparent bg-pink-accent text-[#2b2b2b] text-[10px] uppercase">
                              <BadgeCheck className="size-3" /> Verified
                            </Badge>
                          ) : showProspect ? (
                            <Badge className="border-transparent bg-purple text-white text-[10px] uppercase">
                              Prospect
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider ${STATUS_BADGE[it.status] ?? "border-border/70 bg-muted/40 text-muted-foreground"}`}
                          >
                            {STATUS_LABEL[it.status] ?? "In Review"}
                          </Badge>
                          {it.category && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {CATEGORY_LABEL[it.category] ?? it.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {it.vibe && (
                        <div className="mt-3">
                          <p className="mt-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
                            {it.vibe}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {totalReach > 0 && (
                          <span className="rounded-md border border-pink-accent/40 bg-pink-accent/10 px-2 py-0.5 font-medium text-foreground">
                            Total Audience {formatCount(totalReach)}
                          </span>
                        )}
                        {stats.map(([label, count, url]) =>
                          count != null || url ? (
                            <span
                              key={label}
                              className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5"
                            >
                              {label}
                              {count != null ? ` ${formatCount(count)}` : ""}
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="ml-1 inline-flex items-center text-primary hover:underline"
                                >
                                  <ExternalLink className="size-3" />
                                </a>
                              ) : null}
                            </span>
                          ) : null,
                        )}
                      </div>
                      {(it.example_video_url || it.bio_page_url || it.content_review_url) && (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                          {it.example_video_url && (
                            <a
                              href={it.example_video_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-primary hover:underline"
                            >
                              Example video
                            </a>
                          )}
                          {it.content_review_url && (
                            <a
                              href={it.content_review_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-primary hover:underline"
                            >
                              Content to review
                            </a>
                          )}
                          {it.bio_page_url && (
                            <a
                              href={it.bio_page_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-primary hover:underline"
                            >
                              Bio page
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          };

          return (
            <>
              <div className="mt-10 flex items-center justify-end gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="size-4" />
                  <span>Filter</span>
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                  <SelectTrigger className="w-[180px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <section className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No creators on this roster yet.</p>
                ) : activeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active creators on this roster.</p>
                ) : (
                  activeItems.map(renderItem)
                )}
              </section>

              {archivedItems.length > 0 && (
                <section className="mt-8">
                  <details className="group rounded-2xl border border-border/60 bg-muted/20">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
                      <span className="uppercase tracking-wider">
                        Archive · {archivedItems.length}
                      </span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 p-3 pt-0">
                      {archivedItems.map(renderItem)}
                    </div>
                  </details>
                </section>
              )}
            </>
          );
        })()}

      </main>
      <SiteFooter />
    </div>
  );
}
