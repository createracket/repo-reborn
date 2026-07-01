import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Users, BadgeCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  example_video_url: string | null;
  bio_page_url: string | null;
  position: number;
  status: string;
  category: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  in_review: "In Review",
  approved: "Approved",
  confirmed: "Confirmed",
  in_production: "In Production",
  briefed: "Briefed",
  contracting: "Contracting",
  live: "Live",
};

const STATUS_BADGE: Record<string, string> = {
  in_review: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  approved: "border-primary/40 bg-primary/10 text-primary",
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  in_production: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  briefed: "border-chart-5/40 bg-chart-5/10 text-chart-5",
  contracting: "border-purple/40 bg-purple/10 text-purple",
  live: "border-pink-accent/40 bg-pink-accent/10 text-pink-accent",
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


function PublicRosterPage() {
  const { slug } = Route.useParams();
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase
        .from("rosters")
        .select(
          "id, title, description, slug, published, published_at, header_image_url, hide_prospect_tags",
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
          "id, kind, name, avatar_url, instagram_url, instagram_followers, tiktok_url, tiktok_followers, youtube_url, youtube_subscribers, spotify_url, spotify_monthly_listens, example_video_url, bio_page_url, position, status",
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

  const totalFollowers = items.reduce(
    (acc, it) =>
      acc +
      (it.instagram_followers ?? 0) +
      (it.tiktok_followers ?? 0) +
      (it.youtube_subscribers ?? 0) +
      (it.spotify_monthly_listens ?? 0),
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

        {totalFollowers > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
          </div>
        )}

        <section className="mt-12 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creators on this roster yet.</p>
          ) : (
            items.map((it) => {
              const stats: Array<[string, number | null, string | null]> = [
                ["Instagram", it.instagram_followers, it.instagram_url],
                ["TikTok", it.tiktok_followers, it.tiktok_url],
                ["YouTube", it.youtube_subscribers, it.youtube_url],
                ["Spotify", it.spotify_monthly_listens, it.spotify_url],
              ];
              const totalReach =
                (it.instagram_followers ?? 0) +
                (it.tiktok_followers ?? 0) +
                (it.youtube_subscribers ?? 0) +
                (it.spotify_monthly_listens ?? 0);
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
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {totalReach > 0 && (
                            <span className="rounded-md border border-pink-accent/40 bg-pink-accent/10 px-2 py-0.5 font-medium text-foreground">
                              Total reach {formatCount(totalReach)}
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
                        {(it.example_video_url || it.bio_page_url) && (
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
            })
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
