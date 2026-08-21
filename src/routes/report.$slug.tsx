import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Instagram, Youtube, Music2, Users } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCount, formatPct, type Platform } from "@/lib/youtube-utils";
import { PostThumb } from "@/components/reports/PostThumb";
import { getReportGate, unlockReport, getReportForMember } from "@/lib/report-access.functions";


type PublicReport = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  header_image_url: string | null;
  profile_image_url: string | null;
  categories: string[] | null;
  hide_categories: boolean | null;
  template: string | null;
};

type FeaturedComment = {
  handle?: string;
  avatar_url?: string;
  text?: string;
  meta?: string;
};

type PublicPost = {
  id: string;
  creator_id: string;
  platform: Platform;
  post_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  posted_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  followers: number | null;
  reach_pct: number | null;
  engagement_rate_pct: number | null;
  interaction_pct: number | null;
  watch_time_hours: number | null;
  sentiment_score: number | null;
  featured_comments: FeaturedComment[];
  hashtags: string[];
  brand_tag: string | null;
  extra_mention?: boolean | null;
  position: number;
  updated_at: string | null;
};

type PublicCreator = {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  position: number;
  location: string | null;
  category: string | null;
  posts: PublicPost[];
};

const REPORT_LOCATION_FLAG: Record<string, string> = { GB: "🇬🇧", US: "🇺🇸", NZ: "🇳🇿", AU: "🇦🇺" };
const REPORT_LOCATION_LABEL: Record<string, string> = { GB: "UK", US: "USA", NZ: "New Zealand", AU: "Australia" };

const PLATFORM_ICON: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const Route = createFileRoute("/report/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Campaign Report — ${params.slug}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicReportPage,
});

function PublicReportPage() {
  const { slug } = Route.useParams();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [creators, setCreators] = useState<PublicCreator[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "gated">("loading");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [showExtras, setShowExtras] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [gate, setGate] = useState<{ title: string; header_image_url: string | null; code_label: string } | null>(null);
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: r } = await (supabase as any)
        .from("public_campaign_reports")
        .select("id, title, description, slug, published, published_at, header_image_url, profile_image_url, categories, hide_categories, template")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!r) {
        // Signed-in owners/admins/assigned users bypass the passcode gate.
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          try {
            const mine = await getReportForMember({ data: { slug } });
            if (mine.ok) {
              const rows = (mine.creators as unknown as Omit<PublicCreator, "posts">[]) ?? [];
              const allPosts = (mine.posts as unknown as PublicPost[]) ?? [];
              const grouped = new Map<string, PublicPost[]>();
              allPosts.forEach((p) => {
                const arr = grouped.get(p.creator_id) ?? [];
                arr.push(p);
                grouped.set(p.creator_id, arr);
              });
              setReport(mine.report as unknown as PublicReport);
              setCreators(rows.map((c) => ({ ...c, posts: grouped.get(c.id) ?? [] })));
              setStatus("ready");
              return;
            }
          } catch {
            /* fall through to the gate */
          }
        }
        const info = await getReportGate({ data: { slug } });
        if (info.gated) {
          setGate({ title: info.title, header_image_url: info.header_image_url, code_label: info.code_label });
          setStatus("gated");
        } else {
          setStatus("missing");
        }
        return;
      }
      setReport(r as PublicReport);
      const { data: cr } = await (supabase as any)
        .from("campaign_report_creators")
        .select("id, name, handle, avatar_url, position, location, category")
        .eq("report_id", (r as PublicReport).id)
        .order("position", { ascending: true });
      const creatorRows = ((cr as any[]) ?? []) as Omit<PublicCreator, "posts">[];
      if (creatorRows.length === 0) {
        setCreators([]);
        setStatus("ready");
        return;
      }
      const ids = creatorRows.map((c) => c.id);
      const { data: pr } = await (supabase as any)
        .from("campaign_report_posts")
        .select("*, updated_at")
        .in("creator_id", ids)
        .order("position", { ascending: true });
      const posts = ((pr as any[]) ?? []) as PublicPost[];
      const byCreator = new Map<string, PublicPost[]>();
      posts.forEach((p) => {
        const arr = byCreator.get(p.creator_id) ?? [];
        arr.push(p);
        byCreator.set(p.creator_id, arr);
      });
      setCreators(creatorRows.map((c) => ({ ...c, posts: byCreator.get(c.id) ?? [] })));
      setStatus("ready");
    })();
  }, [slug]);

  useEffect(() => {
    setVisibleCount(20);
  }, [monthFilter, platformFilter, showExtras]);



  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading report…</p>
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
        const res = await unlockReport({ data: { slug, email: gateEmail.trim(), code: gateCode.trim() } });
        if (!res.ok) {
          setGateError("That code doesn't look right. Check it and try again.");
          return;
        }
        const creatorRows = (res.creators as unknown as Omit<PublicCreator, "posts">[]) ?? [];
        const posts = (res.posts as unknown as PublicPost[]) ?? [];
        const byCreator = new Map<string, PublicPost[]>();
        posts.forEach((p) => {
          const arr = byCreator.get(p.creator_id) ?? [];
          arr.push(p);
          byCreator.set(p.creator_id, arr);
        });
        setReport(res.report as unknown as PublicReport);
        setCreators(creatorRows.map((c) => ({ ...c, posts: byCreator.get(c.id) ?? [] })));
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
            <Users className="mr-1.5 size-3" /> Report
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">{gate.title}</h1>
          <p className="mt-3 text-muted-foreground">
            This report is private. Enter your email and the access code you were given to view it.
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
              {gateBusy ? "Checking…" : "View report"}
            </Button>
          </form>
        </main>
        <SiteFooter />
      </div>
    );
  }


  if (status === "missing" || !report) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl">Report not found</h1>
          <p className="mt-2 text-muted-foreground">
            This report may be unpublished or doesn't exist.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Posts tagged as "extra mentions" are hidden (and excluded from every total)
  // unless the visitor switches the extra mentions toggle on.
  const scopedCreators = creators
    .map((c) => ({ ...c, posts: showExtras ? c.posts : c.posts.filter((p) => !p.extra_mention) }))
    .filter((c) => c.posts.length > 0);
  const hasExtraMentions = creators.some((c) => c.posts.some((p) => !!p.extra_mention));
  const allPosts = scopedCreators.flatMap((c) => c.posts);

  const monthOptions = (() => {
    const map = new Map<string, string>();
    allPosts.forEach((p) => {
      if (!p.posted_at) return;
      const d = new Date(p.posted_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
      map.set(key, label);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, label]) => ({ key, label }));
  })();

  const filteredCreators = scopedCreators
    .map((c) => ({
      ...c,
      posts: c.posts.filter((p) => {
        if (platformFilter !== "all" && p.platform !== platformFilter) return false;
        if (monthFilter === "all") return true;
        if (!p.posted_at) return false;
        const d = new Date(p.posted_at);
        if (Number.isNaN(d.getTime())) return false;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        return key === monthFilter;
      }),
    }))
    .filter((c) => c.posts.length > 0);

  // Only render `visibleCount` posts at a time so long reports stay fast.
  const filteredPostCount = filteredCreators.reduce((n, c) => n + c.posts.length, 0);
  const visibleCreators = (() => {
    let budget = visibleCount;
    const out: typeof filteredCreators = [];
    for (const c of filteredCreators) {
      if (budget <= 0) break;
      const posts = c.posts.slice(0, budget);
      budget -= posts.length;
      out.push({ ...c, posts });
    }
    return out;
  })();
  const hasMorePosts = filteredPostCount > visibleCount;

  // Negative values are "hidden/unavailable" sentinels from social scrapers
  // (e.g. Instagram posts with like counts turned off) — never count them.
  const num = (v: number | null | undefined) => (v == null || v < 0 ? 0 : v);
  const sumTotals = (posts: PublicPost[]) =>
    posts.reduce(
      (acc, p) => ({
        views: acc.views + num(p.views),
        likes: acc.likes + num(p.likes),
        comments: acc.comments + num(p.comments),
        shares: acc.shares + num(p.shares),
        saves: acc.saves + num(p.saves),
        followers: acc.followers + num(p.followers),
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, followers: 0 },
    );

  // Overall ER respects per-post engagement rates when they have been calculated.
  // Posts with a saved engagement_rate_pct are weighted by their followers (or
  // counted equally when followers are unknown); remaining posts fall back to the
  // aggregate estimate so a partially-filled report still reads sensibly.
  const computeEngagementPct = (posts: PublicPost[]) => {
    const withEr = posts.filter(
      (p) => p.engagement_rate_pct != null && (p.engagement_rate_pct as number) >= 0,
    );
    if (withEr.length > 0) {
      const useFollowers = withEr.some((p) => num(p.followers) > 0);
      let weightSum = 0;
      let weighted = 0;
      withEr.forEach((p) => {
        const w = useFollowers ? num(p.followers) : 1;
        if (w <= 0) return;
        weightSum += w;
        weighted += w * (p.engagement_rate_pct as number);
      });
      if (weightSum > 0) return weighted / weightSum;
    }
    const acc = sumTotals(posts);
    const engagement = acc.likes + acc.comments + acc.shares + acc.saves;
    return acc.followers > 0 ? (engagement / acc.followers) * 0.4 * 100 : null;
  };

  // Reach is summed post by post: use the entered Reach % when present,
  // otherwise fall back to the 80%-of-views estimate.
  const computeReach = (posts: PublicPost[]) =>
    Math.round(
      posts.reduce(
        (acc, p) =>
          acc + num(p.views) * ((p.reach_pct != null && p.reach_pct >= 0 ? p.reach_pct : 80) / 100),
        0,
      ),
    );
  const hasRealReach = (posts: PublicPost[]) =>
    posts.some((p) => p.reach_pct != null && p.reach_pct >= 0);

  const totals = sumTotals(allPosts);
  const estEngagementPct = computeEngagementPct(allPosts);
  const totalReach = computeReach(allPosts);

  const monthTotals = (() => {
    const posts = filteredCreators.flatMap((c) => c.posts);
    const acc = sumTotals(posts);
    const engagementPct = computeEngagementPct(posts);
    return {
      ...acc,
      engagementPct,
      reach: computeReach(posts),
      hasRealReach: hasRealReach(posts),
      posts: posts.length,
      creators: filteredCreators.length,
    };
  })();


  const latestUpdate = (() => {
    const dates: Date[] = [];
    if (report.published_at) dates.push(new Date(report.published_at));
    allPosts.forEach((p) => {
      if (p.updated_at) dates.push(new Date(p.updated_at));
    });
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  })();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
        {report.header_image_url && (
          <div
            className="mb-10 overflow-hidden rounded-2xl border border-border/60"
            style={{ aspectRatio: "16 / 9" }}
          >
            <img
              src={report.header_image_url}
              alt={report.title}
              className="size-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-start gap-5">
          {report.profile_image_url ? (
            <img
              src={report.profile_image_url}
              alt={report.title}
              className="size-24 shrink-0 rounded-xl border border-border/60 object-cover md:size-32"
            />
          ) : null}
          <div className="min-w-[240px] flex-1">
            <Badge className="border-transparent bg-lime uppercase tracking-[0.2em] text-primary-foreground hover:bg-lime">
              <Users className="mr-1.5 size-3" /> Campaign Report
            </Badge>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">{report.title}</h1>
            {report.description && (
              <p className="mt-4 whitespace-pre-wrap text-lg text-muted-foreground">
                {report.description}
              </p>
            )}
          </div>
        </div>
        {latestUpdate && (
          <p className="mt-2 text-xs text-muted-foreground md:hidden">
            Last updated: {latestUpdate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {allPosts.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TotalStat label="Total views" value={formatCount(totals.views)} />
            <TotalStat label={hasRealReach(allPosts) ? "Reach" : "Est. reach"} value={formatCount(totalReach)} />
            <TotalStat
              label="Est. engagement"
              value={estEngagementPct != null ? `${estEngagementPct.toFixed(2)}%` : "—"}
            />
            <TotalStat label="Total creators" value={String(creators.length)} />
            <TotalStat label="Live posts" value={String(allPosts.length)} />
          </div>
        )}

        {latestUpdate && (
          <p className="mt-3 hidden text-xs text-muted-foreground md:block">
            Last updated: {latestUpdate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {monthFilter !== "all" && filteredCreators.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TotalStat label="Month views" value={formatCount(monthTotals.views)} />
            <TotalStat label="Month reach" value={formatCount(monthTotals.reach)} />
            <TotalStat
              label="Month engagement"
              value={monthTotals.engagementPct != null ? `${monthTotals.engagementPct.toFixed(2)}%` : "—"}
            />
            <TotalStat label="Month creators" value={String(monthTotals.creators)} />
            <TotalStat label="Month posts" value={String(monthTotals.posts)} />
          </div>
        )}

        {monthOptions.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-1.5">
              {(["all", "instagram", "tiktok"] as const).map((p) => {
                const active = platformFilter === p;
                const label = p === "all" ? "All" : p === "instagram" ? "IG" : "TikTok";
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="size-4" />
              <span>Filter by month</span>
            </div>
            <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v)}>
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <section className="mt-6 space-y-10">
          {filteredCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {monthFilter === "all" && platformFilter === "all"
                ? "No creators on this report yet."
                : "No posts match this filter."}
            </p>
          ) : report.template === "simple" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredCreators.flatMap((c) =>
                c.posts.map((p) => (
                  <SimplePostCard key={p.id} post={p} creator={c} />
                )),
              )}
            </div>
          ) : (
            filteredCreators.map((c) => (
              <div key={c.id} className="space-y-4">
                {c.posts.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center gap-3 p-5">
                      <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                          c.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display text-xl">{c.name}</h2>
                        {c.handle && (
                          <p className="text-sm text-muted-foreground">{c.handle}</p>
                        )}
                        {!report.hide_categories && c.category && (
                          <span className="mt-1 inline-block rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                            {c.category}
                          </span>
                        )}
                      </div>
                      <p className="ml-auto text-sm text-muted-foreground">No posts yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  c.posts.map((p) => (
                    <PostCard key={p.id} post={p} creator={c} hideCategory={!!report.hide_categories} />
                  ))
                )}
              </div>
            ))

          )}
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}

function TotalStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function SimplePostCard({ post, creator }: { post: PublicPost; creator: PublicCreator }) {
  const Icon = PLATFORM_ICON[post.platform] ?? Instagram;
  const media = (
    <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "9 / 16" }}>
      <PostThumb src={post.thumbnail_url} />

      <span
        className="absolute left-2 top-2 inline-flex items-center rounded-full bg-background/80 p-1.5 backdrop-blur"
        title={PLATFORM_LABEL[post.platform]}
      >
        <Icon
          className={
            "size-3.5 " +
            (post.platform === "instagram"
              ? "text-pink-accent"
              : post.platform === "tiktok"
                ? "text-lime"
                : "")
          }
          aria-label={PLATFORM_LABEL[post.platform]}
        />
      </span>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3">
        {post.post_url ? (
          <a href={post.post_url} target="_blank" rel="noreferrer noopener" className="block">
            {media}
          </a>
        ) : (
          media
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-base leading-tight">{creator.name}</p>
          {creator.handle && (
            <p className="truncate text-xs text-muted-foreground">{creator.handle}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
          <SimpleMetric label="Views" value={formatCount(post.views)} />
          <SimpleMetric label="Likes" value={formatCount(post.likes)} />
          <SimpleMetric label="Comments" value={formatCount(post.comments)} />
          <SimpleMetric label="ER %" value={formatPct(post.engagement_rate_pct)} />
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl leading-none">{value}</p>
    </div>
  );
}



function ExpandableCaption({ caption }: { caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = caption.split("\n").filter(Boolean);
  const needsTruncate = lines.length > 2 || caption.length > 140;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Caption</p>
      <div
        className={`mt-1 font-medium whitespace-pre-wrap transition-all ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {caption}
      </div>
      {needsTruncate && (
        <button
          onClick={() => setExpanded((s) => !s)}
          className="mt-1 text-xs font-semibold text-pink-accent hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function PostCard({ post, creator, hideCategory }: { post: PublicPost; creator: PublicCreator; hideCategory: boolean }) {
  const Icon = PLATFORM_ICON[post.platform] ?? Instagram;
  // Only show sentiment if it was intentionally adjusted (default seed is 50).
  const sentiment = post.sentiment_score != null && post.sentiment_score !== 50 ? post.sentiment_score : null;

  return (
    <Card>
      <CardContent className="grid gap-6 p-6 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                creator.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate font-display text-lg leading-tight">{creator.name}</h3>
                {creator.location && REPORT_LOCATION_FLAG[creator.location] && (
                  <span
                    className="text-base leading-none"
                    title={REPORT_LOCATION_LABEL[creator.location]}
                    aria-label={REPORT_LOCATION_LABEL[creator.location]}
                  >
                    {REPORT_LOCATION_FLAG[creator.location]}
                  </span>
                )}
              </div>
              {creator.handle && (
                <p className="truncate text-xs text-muted-foreground">{creator.handle}</p>
              )}
              {!hideCategory && creator.category && (
                <span className="mt-1 inline-block rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {creator.category}
                </span>
              )}
            </div>
          </div>
          <div
            className="overflow-hidden rounded-xl bg-muted"
            style={{ aspectRatio: "4 / 5" }}
          >
            {post.post_url ? (
              <a
                href={post.post_url}
                target="_blank"
                rel="noreferrer noopener"
                className="block size-full"
              >
                <PostThumb src={post.thumbnail_url} />
              </a>
            ) : (
              <PostThumb src={post.thumbnail_url} />
            )}

          </div>
          {post.featured_comments && post.featured_comments.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2.5">
              {post.featured_comments.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="size-6 shrink-0 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold">{c.handle || "user"}</span>{" "}
                      {c.text}
                    </p>
                    {c.meta && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{c.meta}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div className="flex items-start justify-end">
            <PlatformBadge platform={post.platform} postUrl={post.post_url} />
          </div>


          <div className="grid grid-cols-3 gap-y-4 gap-x-6 border-b border-border/60 pb-4">
            <Metric label="Video Views" value={formatCount(post.views)} />
            <Metric label="Likes" value={formatCount(post.likes)} />
            <Metric label="Saves" value={formatCount(post.saves)} />
            <Metric label="Comments" value={formatCount(post.comments)} />
            <Metric label="Shares" value={formatCount(post.shares)} />
            <Metric label="Reach %" value={formatPct(post.reach_pct)} />
            <Metric label="Interaction %" value={formatPct(post.interaction_pct)} />
            <Metric
              label="Watch Time"
              value={post.watch_time_hours != null ? `${post.watch_time_hours}h` : "—"}
            />
            <Metric label="ER %" value={formatPct(post.engagement_rate_pct)} />
          </div>

          {sentiment != null && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Sentiment
              </p>
              <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-purple via-pink-accent to-green-500">
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${Math.min(100, Math.max(0, sentiment))}%` }}
                >
                  <div className="size-4 rounded-full border-2 border-background bg-foreground" />
                </div>
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-sm">
            {post.posted_at && (
              <p className="text-xs font-semibold uppercase tracking-wider text-pink-accent">
                Post date: {new Date(post.posted_at).toLocaleDateString()}
              </p>
            )}
            {post.caption && <ExpandableCaption caption={post.caption} />}
            {post.hashtags && post.hashtags.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
              </p>
            )}
            {post.brand_tag && (
              <div className="pt-1">
                <Badge className="border-transparent bg-green-500/20 text-foreground">
                  {post.brand_tag}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformBadge({
  platform,
  postUrl,
}: {
  platform: Platform;
  postUrl: string | null;
}) {
  const Icon = PLATFORM_ICON[platform] ?? Instagram;
  const label = PLATFORM_LABEL[platform];
  const badgeClasses: Record<Platform, string> = {
    instagram:
      "border-primary/30 bg-primary/15 text-primary",
    tiktok:
      "border-pink-accent/30 bg-pink-accent/15 text-pink-accent",
    youtube:
      "border-destructive/30 bg-destructive/15 text-destructive",
  };
  const classes = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClasses[platform]}`;
  return postUrl ? (
    <a
      href={postUrl}
      target="_blank"
      rel="noreferrer noopener"
      className={classes}
      title={label}
    >
      <Icon className="size-4" aria-label={label} />
      <ExternalLink className="size-3 opacity-70" />
    </a>
  ) : (
    <span className={classes} title={label}>
      <Icon className="size-4" aria-label={label} />
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl leading-none">{value}</p>
    </div>
  );
}
