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
import { getRosterGate, unlockRoster } from "@/lib/roster-access.functions";
import { socialAudience, totalFans } from "@/lib/audience";

type PublicRoster = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  updated_at: string | null;
  header_image_url: string | null;
  profile_image_url: string | null;

  hide_prospect_tags: boolean;
  hide_statuses: boolean;
  est_engagement_pct: number | null;
  categories: string[] | null;
  custom_links: Array<{ label: string; url: string }> | null;
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
  twitch_url: string | null;
  twitch_followers: number | null;
  facebook_url: string | null;
  facebook_followers: number | null;
  x_url: string | null;
  x_followers: number | null;
  custom_label: string | null;
  custom_url: string | null;
  custom_followers: number | null;
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
  categories: string[] | null;
  location: string | null;
};

function itemCats(it: PublicItem): string[] {
  const arr = Array.isArray(it.categories) ? it.categories.filter((c): c is string => !!c) : [];
  if (arr.length > 0) return arr;
  return it.category ? [it.category] : [];
}

const LOCATION_FLAG: Record<string, string> = { GB: "🇬🇧", US: "🇺🇸", NZ: "🇳🇿", AU: "🇦🇺", JP: "🇯🇵" };
const LOCATION_LABEL: Record<string, string> = { GB: "UK", US: "USA", NZ: "New Zealand", AU: "Australia", JP: "Japan" };

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
const CATEGORY_BADGE: Record<string, string> = {
  musician: "bg-pink-accent text-[#2b2b2b]",
  ugc: "bg-purple text-white",
  egc: "bg-sky-500 text-white",
  music_fan: "bg-emerald-500 text-white",
  artist_exchange: "bg-rose-500 text-white",
};
function categoryLabel(value: string) {
  return CATEGORY_LABEL[value] ?? value;
}
function categoryBadgeClass(value: string) {
  return CATEGORY_BADGE[value] ?? "bg-primary/25 text-primary border border-primary/40";
}

const STATUS_BADGE_CLASS = "border-border/70 bg-muted/40 text-muted-foreground";



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


function PublicRosterPage() {
  const { slug } = Route.useParams();
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "gated">("loading");
  const [gate, setGate] = useState<{ title: string; header_image_url: string | null; code_label: string } | null>(null);
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");


  useEffect(() => {
    (async () => {
      const { data: r } = await (supabase as any)
        .from("public_rosters")
        .select(
          "id, title, description, slug, published, published_at, updated_at, header_image_url, profile_image_url, hide_prospect_tags, hide_statuses, est_engagement_pct, categories, custom_links",
        )
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!r) {
        const info = await getRosterGate({ data: { slug } });
        if (info.gated) {
          setGate({ title: info.title, header_image_url: info.header_image_url, code_label: info.code_label });
          setStatus("gated");
        } else {
          setStatus("missing");
        }
        return;
      }
      const pr = r as unknown as PublicRoster;
      setRoster(pr);
      const { data: it } = await supabase
        .from("roster_items")
        .select(
          "id, kind, name, avatar_url, vibe, instagram_url, instagram_followers, tiktok_url, tiktok_followers, youtube_url, youtube_subscribers, twitch_url, twitch_followers, facebook_url, facebook_followers, x_url, x_followers, custom_label, custom_url, custom_followers, spotify_url, spotify_monthly_listens, apple_music_url, apple_music_followers, example_video_url, bio_page_url, content_review_url, position, status, category, categories, location",
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

  if (status === "gated" && gate) {
    const submitGate = async (e: React.FormEvent) => {
      e.preventDefault();
      setGateBusy(true);
      setGateError(null);
      try {
        const res = await unlockRoster({ data: { slug, email: gateEmail.trim(), code: gateCode.trim() } });
        if (!res.ok) {
          setGateError("That code doesn't look right. Check it and try again.");
          return;
        }
        setRoster(res.roster as unknown as PublicRoster);
        setItems((res.items as unknown as PublicItem[]) ?? []);
        setStatus("ready");
      } catch {
        setGateError("Something went wrong. Please try again.");
      } finally {
        setGateBusy(false);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-2xl px-4 py-12 md:py-20">
          {gate.header_image_url ? (
            <div className="mb-10 overflow-hidden rounded-2xl border border-border/60" style={{ aspectRatio: "16 / 9" }}>
              <img src={gate.header_image_url} alt={gate.title} className="size-full object-cover" />
            </div>
          ) : null}
          <Badge variant="outline" className="uppercase tracking-[0.2em]">
            <Users className="mr-1.5 size-3" /> Roster
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">{gate.title}</h1>
          <p className="mt-3 text-muted-foreground">
            This roster is private. Enter your email and the access code you were given to view it.
          </p>

          <form onSubmit={submitGate} className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6">
            <div>
              <label htmlFor="gate-email" className="text-sm font-medium">Email</label>
              <input
                id="gate-email"
                type="email"
                required
                maxLength={255}
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-pink-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="gate-code" className="text-sm font-medium">{gate.code_label}</label>
              <input
                id="gate-code"
                required
                maxLength={120}
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                placeholder="Enter your code"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-pink-accent focus:outline-none"
              />
            </div>
            {gateError && <p className="text-sm text-destructive">{gateError}</p>}
            <Button type="submit" disabled={gateBusy} className="w-full">
              {gateBusy ? "Checking…" : "View roster"}
            </Button>
          </form>
        </main>
        <SiteFooter />
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

  const visibleForTotals = items.filter((it) => it.status !== "hold");
  const totalSocial = visibleForTotals.reduce((acc, it) => acc + socialAudience(it), 0);
  const totalAll = visibleForTotals.reduce((acc, it) => acc + totalFans(it), 0);

  

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-3 py-8 sm:px-4 md:py-12">
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

        <div className="flex flex-wrap items-start gap-5">
          {roster.profile_image_url ? (
            <img
              src={roster.profile_image_url}
              alt={roster.title}
              className="size-24 shrink-0 rounded-xl border border-border/60 object-cover md:size-32"
            />
          ) : null}
          <div className="min-w-[240px] flex-1">
            <Badge className="border-transparent bg-pink-accent uppercase tracking-[0.2em] text-[#2b2b2b] hover:bg-pink-accent">
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
          </div>
        </div>

        {(roster.updated_at || roster.published_at) && (
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
            Last updated {new Date((roster.updated_at ?? roster.published_at) as string).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {roster.custom_links && roster.custom_links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {roster.custom_links.map((l, i) => (
              l.url ? (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-md border border-pink-accent/40 bg-pink-accent/10 px-3 py-1.5 text-sm text-foreground hover:bg-pink-accent/20"
                >
                  {l.label || l.url}
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null
            ))}
          </div>
        )}

        {(totalSocial > 0 || totalAll > 0 || roster.est_engagement_pct != null) && (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {totalSocial > 0 && (
              <>
                <Card className="border-pink-accent">

                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Socials
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl">
                      {formatCount(totalSocial)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Excludes streaming platforms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Fans
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl">
                      {formatCount(totalAll)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Socials + streaming</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Est. reach
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl">
                      {formatCount(Math.round(totalSocial * 0.4))}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {roster.est_engagement_pct != null && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                    Est. engagement
                  </p>
                  <p className="mt-1 font-display text-xl sm:text-2xl">
                    {roster.est_engagement_pct}%
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {(() => {
          const matches = (it: PublicItem) =>
            (categoryFilter === "all" || itemCats(it).includes(categoryFilter)) &&
            (roster.hide_statuses || statusFilter === "all" || (it.status || "in_review") === statusFilter);
          const activeItems = items.filter((it) => it.status !== "hold" && it.status !== "live" && matches(it));
          const liveItems = items.filter((it) => it.status === "live" && matches(it));
          const archivedItems = items.filter((it) => it.status === "hold" && matches(it));


          const renderItem = (it: PublicItem) => {
            const stats: Array<[string, number | null, string | null]> = [
              ["IG", it.instagram_followers, it.instagram_url],
              ["TT", it.tiktok_followers, it.tiktok_url],
              ["YT", it.youtube_subscribers, it.youtube_url],
              ["Twitch", it.twitch_followers, it.twitch_url],
              ["Facebook", it.facebook_followers, it.facebook_url],
              ["X", it.x_followers, it.x_url],
              [it.custom_label || "Link", it.custom_followers, it.custom_url],
              ["Spotify streams", it.spotify_monthly_listens, it.spotify_url],
              ["Apple", it.apple_music_followers, it.apple_music_url],
            ];
            const itemSocial = socialAudience(it);
            const itemFans = totalFans(it);

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
                <CardContent className="p-4 sm:p-5">

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="size-12 sm:size-14 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {it.avatar_url ? (
                        <img src={it.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span>{initials || "?"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate font-display text-lg sm:text-xl">{it.name}</h3>
                            {it.location && LOCATION_FLAG[it.location] && (
                              <span
                                className="text-base leading-none"
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
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {itemFans > 0 && (
                              <span className="font-semibold text-foreground">
                                {formatCount(itemFans)}{" "}
                                <span className="font-normal text-muted-foreground">fans</span>
                              </span>
                            )}
                            {itemSocial > 0 && itemFans !== itemSocial && (
                              <span className="font-semibold text-foreground">
                                {formatCount(itemSocial)}{" "}
                                <span className="font-normal text-muted-foreground">socials</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {itemCats(it).map((c) => (
                            <span key={c} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClass(c)}`}>
                              {categoryLabel(c)}
                            </span>
                          ))}
                          {!roster.hide_statuses && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wider ${STATUS_BADGE_CLASS}`}
                            >
                              {STATUS_LABEL[it.status] ?? "In Review"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {stats.map(([label, count, url]) =>
                          count != null || url ? (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-0.5"
                            >
                              {label}
                              {count != null ? ` ${formatCount(count)}` : ""}
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center text-primary hover:underline"
                                >
                                  <ExternalLink className="size-3" />
                                </a>
                              ) : null}
                            </span>
                          ) : null,
                        )}
                      </div>

                      {it.vibe && (
                        <p className="mt-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
                          {it.vibe}
                        </p>
                      )}

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
                          className="text-pink-accent hover:underline"
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
              {(() => {
                const filterValues = Array.from(
                  new Set([
                    ...(roster.categories ?? []),
                    ...items.flatMap((i) => itemCats(i)),
                  ]),
                );
                const statusValues = roster.hide_statuses
                  ? []
                  : Array.from(new Set(items.map((i) => i.status || "in_review")));
                if (filterValues.length === 0 && statusValues.length === 0) return null;
                return (
                  <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Filter className="size-4" />
                      <span>Filter</span>
                    </div>
                    {filterValues.length > 0 && (
                      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                        <SelectTrigger className="w-[180px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {filterValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {categoryLabel(v)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {statusValues.length > 0 && (
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                        <SelectTrigger className="w-[180px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {statusValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {STATUS_LABEL[v] ?? "In Review"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })()}

              <section className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No creators on this roster yet.</p>
                ) : activeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active creators on this roster.</p>
                ) : (
                  activeItems.map(renderItem)
                )}
              </section>

              {liveItems.length > 0 && (
                <section className="mt-8">
                  <details className="group rounded-2xl border border-pink-accent/40 bg-pink-accent/5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-pink-accent hover:text-foreground">
                      <span className="uppercase tracking-wider">
                        Live · {liveItems.length}
                      </span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 p-3 pt-0">
                      {liveItems.map(renderItem)}
                    </div>
                  </details>
                </section>
              )}

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
