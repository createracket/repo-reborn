import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Instagram, Youtube, Music2, Users } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCount, formatPct, type Platform } from "@/lib/youtube-utils";

type PublicReport = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  header_image_url: string | null;
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
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    (async () => {
      const { data: r } = await (supabase as any)
        .from("campaign_reports")
        .select("id, title, description, slug, published, published_at, header_image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!r) {
        setStatus("missing");
        return;
      }
      setReport(r as PublicReport);
      const { data: cr } = await (supabase as any)
        .from("campaign_report_creators")
        .select("id, name, handle, avatar_url, position, location")
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

  const allPosts = creators.flatMap((c) => c.posts);
  const totals = allPosts.reduce(
    (acc, p) => ({
      views: acc.views + (p.views ?? 0),
      likes: acc.likes + (p.likes ?? 0),
      comments: acc.comments + (p.comments ?? 0),
      shares: acc.shares + (p.shares ?? 0),
      saves: acc.saves + (p.saves ?? 0),
      followers: acc.followers + (p.followers ?? 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, followers: 0 },
  );
  const totalEngagement = totals.likes + totals.comments + totals.shares + totals.saves;
  const estEngagementPct =
    totals.followers > 0 ? (totalEngagement / totals.followers) * 0.4 * 100 : null;
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

        <Badge variant="outline" className="uppercase tracking-[0.2em]">
          <Users className="mr-1.5 size-3" /> Campaign Report
        </Badge>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">{report.title}</h1>
        {report.description && (
          <p className="mt-4 whitespace-pre-wrap text-lg text-muted-foreground">
            {report.description}
          </p>
        )}
        {latestUpdate && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: {latestUpdate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {allPosts.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TotalStat label="Total views" value={formatCount(totals.views)} />
            <TotalStat label="Est. reach" value={formatCount(Math.round(totals.views * 0.8))} />
            <TotalStat
              label="Est. engagement"
              value={estEngagementPct != null ? `${estEngagementPct.toFixed(2)}%` : "—"}
            />
            <TotalStat label="Total creators" value={String(creators.length)} />
            <TotalStat label="Live posts" value={String(allPosts.length)} />
          </div>
        )}

        <section className="mt-12 space-y-10">
          {creators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creators on this report yet.</p>
          ) : (
            creators.map((c) => (
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
                      <div>
                        <h2 className="font-display text-xl">{c.name}</h2>
                        {c.handle && (
                          <p className="text-sm text-muted-foreground">{c.handle}</p>
                        )}
                      </div>
                      <p className="ml-auto text-sm text-muted-foreground">No posts yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  c.posts.map((p) => <PostCard key={p.id} post={p} creator={c} />)
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

function PostCard({ post, creator }: { post: PublicPost; creator: PublicCreator }) {
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
            </div>
          </div>
          <div
            className="overflow-hidden rounded-xl bg-muted"
            style={{ aspectRatio: "4 / 5" }}
          >
            {post.thumbnail_url ? (
              post.post_url ? (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block size-full"
                >
                  <img
                    src={post.thumbnail_url}
                    alt=""
                    className="size-full object-cover"
                  />
                </a>
              ) : (
                <img src={post.thumbnail_url} alt="" className="size-full object-cover" />
              )
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No thumbnail
              </div>
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
      <Icon className="size-4" />
      {label}
      <ExternalLink className="size-3 opacity-70" />
    </a>
  ) : (
    <span className={classes}>
      <Icon className="size-4" />
      {label}
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
