import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Users, BadgeCheck, ChevronDown, Filter, Copy, Camera } from "lucide-react";

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
import { getAuthSessionResult } from "@/hooks/use-auth";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { getRosterGate, unlockRoster, getRosterForMember } from "@/lib/roster-access.functions";
import { socialAudience, totalFans } from "@/lib/audience";
import { storageImage } from "@/lib/storage-image";
import { parseCoPosts, coPostLabel } from "@/lib/co-posts";
import { shareMeta } from "@/lib/share-meta";
import { getSharePreview } from "@/lib/share-preview.functions";
import {
  RosterCalendar,
  CalendarSnapshotContent,
  initialMonth,
  type CalendarEvent,
} from "@/components/roster/RosterCalendar";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";


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
  hide_metric_socials?: boolean | null;
  hide_metric_fans?: boolean | null;
  hide_metric_reach?: boolean | null;
  hide_metric_engagement?: boolean | null;
  show_metric_creators?: boolean | null;
  est_engagement_pct: number | null;
  categories: string[] | null;
  custom_links: Array<{ label: string; url: string }> | null;
  show_calendar?: boolean | null;
  calendar_events?: CalendarEvent[] | null;
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
  content_review_label: string | null;
  posting_date?: string | null;
  extra_posting_dates?: string[] | null;
  co_posts?: unknown;
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

function statusLabel(value: string) {
  if (!value) return "In Review";
  return STATUS_LABEL[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

const STATUS_BADGE_CLASS = "border-foreground/50 bg-muted/50 font-semibold text-foreground/90";



export const Route = createFileRoute("/roster/$slug")({
  loader: ({ params }) =>
    getSharePreview({ data: { slug: params.slug, kind: "roster" } }).catch(() => null),
  head: ({ loaderData, params }) => ({
    meta: shareMeta({
      preview: loaderData,
      fallbackTitle: `Roster — ${params.slug}`,
      fallbackDescription: "Creator roster.",
      noindex: true,
    }),
  }),
  validateSearch: (search: Record<string, unknown>): { view?: "calendar" | "notes" } => ({
    view: search.view === "calendar" || search.view === "notes" ? search.view : undefined,
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
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const { view: viewParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const view: "list" | "calendar" | "notes" = viewParam ?? "list";
  const setView = (v: "list" | "calendar" | "notes") =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, view: v === "list" ? undefined : v }),
    });
  const [calMonth, setCalMonth] = useState<Date | null>(null);
  const [snapping, setSnapping] = useState(false);
  const snapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pageName = roster?.title?.trim() || gate?.title?.trim();
    if (pageName) document.title = `${pageName} — Create Racket`;
  }, [roster?.title, gate?.title]);


  useEffect(() => {
    (async () => {
      // One round-trip: roster + visible creators together (no request waterfall).
      const { data: bundle } = await (supabase as any).rpc("get_public_roster", { p_slug: slug });
      const r = (bundle as { roster?: PublicRoster } | null)?.roster ?? null;
      if (!r) {
        // Signed-in owners/admins/assigned users bypass the passcode gate.
        const { data: sess } = await getAuthSessionResult();
        if (sess.session) {
          try {
            const mine = await getRosterForMember({ data: { slug } });
            if (mine.ok) {
              setRoster(mine.roster as unknown as PublicRoster);
              setItems((mine.items as unknown as PublicItem[]) ?? []);
              setItemsLoaded(true);
              setStatus("ready");
              return;
            }
          } catch {
            /* fall through to the gate */
          }
        }
        const info = await getRosterGate({ data: { slug } });
        if (info.gated) {
          setGate({ title: info.title, header_image_url: info.header_image_url, code_label: info.code_label });
          setStatus("gated");
        } else {
          setStatus("missing");
        }
        return;
      }
      setRoster(r);
      setStatus("ready");
      setItems(((bundle as { items?: PublicItem[] }).items as PublicItem[]) ?? []);
      setItemsLoaded(true);
    })();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-4xl animate-pulse px-3 py-8 sm:px-4 md:py-12">
          <div className="mb-10 rounded-2xl border border-border/60 bg-muted/40" style={{ aspectRatio: "16 / 9" }} />
          <div className="h-6 w-24 rounded-full bg-muted/60" />
          <div className="mt-4 h-12 w-2/3 rounded-lg bg-muted/50" />
          <div className="mt-4 h-4 w-full rounded bg-muted/40" />
          <div className="mt-2 h-4 w-5/6 rounded bg-muted/40" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border/60 bg-muted/30" />
            ))}
          </div>
          <span className="sr-only">Loading roster…</span>
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
        setItemsLoaded(true);
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
              <img
                src={storageImage(gate.header_image_url, { width: 1200, height: 675 })}
                alt={gate.title}
                width={1200}
                height={675}
                decoding="async"
                className="size-full object-cover"
              />

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
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <a href={`mailto:community@createracket.com?subject=${encodeURIComponent("Can't open roster: " + slug)}&body=${encodeURIComponent("Page: https://createracket.com/roster/" + slug + "\n\nWhat happened:")}`}>Report this problem</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const visibleForTotals = items.filter((it) => it.status !== "hold" && it.status !== "live");
  const totalSocial = visibleForTotals.reduce((acc, it) => acc + socialAudience(it), 0);
  const totalAll = visibleForTotals.reduce((acc, it) => acc + totalFans(it), 0);
  const totalCreators = visibleForTotals.length;
  const showSocials = totalSocial > 0 && !roster.hide_metric_socials;
  const showFans = totalSocial > 0 && !roster.hide_metric_fans;
  const showReach = totalSocial > 0 && !roster.hide_metric_reach;
  const showEngagement = roster.est_engagement_pct != null && !roster.hide_metric_engagement;
  const showCreators = !!roster.show_metric_creators && totalCreators > 0;

  

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <AdminEditButton href={`/roster-builder?edit=${roster.id}`} label="Edit roster" />
      <main className="container mx-auto max-w-4xl px-3 py-8 sm:px-4 md:py-12">
        {roster.header_image_url ? (
          <div
            className="mb-10 overflow-hidden rounded-2xl border border-border/60"
            style={{ aspectRatio: "16 / 9" }}
          >
            <img
              src={storageImage(roster.header_image_url, { width: 1200, height: 675 })}
              alt={roster.title}
              width={1200}
              height={675}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const original = roster.header_image_url;
                if (original && e.currentTarget.src !== original) e.currentTarget.src = original;
              }}
              className="size-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-start gap-5">
          {roster.profile_image_url ? (
            <img
              src={storageImage(roster.profile_image_url, { width: 256, height: 256 })}
              alt={roster.title}
              width={256}
              height={256}
              decoding="async"
              onError={(e) => {
                const original = roster.profile_image_url;
                if (original && e.currentTarget.src !== original) e.currentTarget.src = original;
              }}
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
                  className="inline-flex items-center rounded-md border border-lime/40 bg-lime/10 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-lime hover:bg-lime/25 report-light:border-lime report-light:bg-lime report-light:text-primary-foreground report-light:hover:bg-lime/80"
                >
                  {l.label || l.url}
                </a>
              ) : null
            ))}
          </div>
        )}

        {(showSocials || showFans || showReach || showCreators || showEngagement) && (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {showSocials && (
                <Card className="border-2 border-pink-accent bg-pink-accent/5">


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
            )}
            {showFans && (
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
            )}
            {showReach && (
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
            )}

            {showCreators && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                    Total
                  </p>
                  <p className="mt-1 font-display text-xl sm:text-2xl">
                    {totalCreators}
                  </p>
                </CardContent>
              </Card>
            )}

            {showEngagement && (
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
          const calendarOn = !!roster.show_calendar;
          const activeItems = items.filter((it) => it.status !== "hold" && it.status !== "live" && matches(it));
          const liveItems = items.filter((it) => it.status === "live" && matches(it));
          const archivedItems = items.filter((it) => it.status === "hold" && matches(it));
          const calendarCreators = items.filter(matches);
          const calendarEvents = (roster.calendar_events ?? []) as CalendarEvent[];
          const snapMonth = calMonth ?? initialMonth(calendarCreators);
          const fmtNoteDate = (d: string) => format(parseISO(d), "EEE d MMM");
          const notesText = [
            `${roster.title} — notes (${format(new Date(), "d MMM yyyy")})`,
            "",
            ...activeItems.map((it) => {
              const cats = itemCats(it).map(categoryLabel).join(" / ");
              const dates = [
                ...new Set(
                  [it.posting_date, ...(it.extra_posting_dates ?? [])]
                    .filter((d): d is string => !!d)
                    .map((d) => d.slice(0, 10)),
                ),
              ]
                .sort()
                .map(fmtNoteDate)
                .join(", ");
              return [
                `- ${it.name}${cats ? ` — ${cats}` : ""} — ${formatCount(totalFans(it))} total fans · ${formatCount(socialAudience(it))} social followers`,
                `  Posting: ${dates || "TBC"}`,
                ...(it.vibe?.trim() ? [`  Notes: ${it.vibe.trim()}`] : []),
              ].join("\n");
            }),
          ].join("\n");

          async function downloadSnapshot() {
            if (!roster || !snapRef.current) return;
            setSnapping(true);
            try {
              await new Promise((r) => setTimeout(r, 80));
              const { toPng } = await import("html-to-image");
              const dataUrl = await toPng(snapRef.current, {
                width: 1080,
                height: 1080,
                pixelRatio: 1,
                skipFonts: true,
              });
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `${roster.slug || "roster"}-calendar-${format(snapMonth, "yyyy-MM")}.png`;
              a.click();
              toast.success("Calendar snapshot downloaded");
            } catch {
              toast.error("Couldn't create the snapshot — try again");
            } finally {
              setSnapping(false);
            }
          }


          const renderItem = (it: PublicItem) => {
            const stats: Array<[string, number | null, string | null]> = [
              ["IG", it.instagram_followers, it.instagram_url],
              ["TT", it.tiktok_followers, it.tiktok_url],
              ["YT", it.youtube_subscribers, it.youtube_url],
              ["Twitch", it.twitch_followers, it.twitch_url],
              ["Facebook", it.facebook_followers, it.facebook_url],
              ["X", it.x_followers, it.x_url],
              [it.custom_label || "Link", it.custom_followers, it.custom_url],
              ["Spotify", it.spotify_monthly_listens, it.spotify_url],
              ["Apple Music", it.apple_music_followers, it.apple_music_url],
              ...parseCoPosts(it.co_posts).map(
                (c) => [coPostLabel(c), c.followers, c.url] as [string, number | null, string | null],
              ),

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
              <Card key={it.id} id={`creator-${it.id}`}>
                <CardContent className="p-4 sm:p-5">

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="size-12 sm:size-14 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {it.avatar_url ? (
                        <img
                          src={storageImage(it.avatar_url, { width: 112, height: 112 })}
                          alt=""
                          width={112}
                          height={112}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (it.avatar_url && e.currentTarget.src !== it.avatar_url) {
                              e.currentTarget.src = it.avatar_url;
                            }
                          }}
                          className="size-full object-cover"
                        />
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
                        <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 sm:flex">
                          {itemCats(it).map((c) => (
                            <span key={c} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClass(c)}`}>
                              {categoryLabel(c)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5 text-xs">

                        {stats.map(([label, count, url]) => {
                          if (count == null && !url) return null;
                          const content = (
                            <>
                              <span className="text-[0.7rem] font-semibold tracking-wider">{label}</span>
                              {count != null ? (
                                <span className="text-muted-foreground">{formatCount(count)}</span>
                              ) : null}
                            </>
                          );
                          return url ? (
                            <a
                              key={label}
                              href={url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-foreground transition-colors hover:border-foreground/40 hover:bg-muted/40"
                            >
                              {content}
                            </a>
                          ) : (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-muted-foreground"
                            >
                              {content}
                            </span>
                          );
                        })}

                        </div>
                        {!roster.hide_statuses && (
                          <Badge
                            variant="outline"
                            className={`ml-auto shrink-0 px-3 py-1 text-[10px] uppercase tracking-[0.11em] ${STATUS_BADGE_CLASS}`}
                          >
                            {statusLabel(it.status)}
                          </Badge>
                        )}
                      </div>

                      {itemCats(it).length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                          {itemCats(it).map((c) => (
                            <span key={c} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClass(c)}`}>
                              {categoryLabel(c)}
                            </span>
                          ))}
                        </div>
                      )}



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
                          {it.content_review_label?.trim() || "Content to review"}
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
                if (filterValues.length === 0 && statusValues.length === 0 && !calendarOn) return null;
                return (
                  <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
                    {calendarOn && (
                      <div className="inline-flex w-full rounded-full border border-border/60 p-0.5 text-sm sm:mr-auto sm:w-auto">
                        {(["list", "calendar", "notes"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            className={`flex-1 rounded-full px-4 py-1.5 capitalize transition sm:flex-none ${view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                    {(filterValues.length > 0 || statusValues.length > 0) && (
                    <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                      <Filter className="size-4" />
                      <span>Filter</span>
                    </div>
                    )}
                    {filterValues.length > 0 && (
                      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                        <SelectTrigger className="w-[calc(50%-0.375rem)] text-sm sm:w-[180px]">
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
                        <SelectTrigger className="w-[calc(50%-0.375rem)] text-sm sm:w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {statusValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {statusLabel(v)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })()}

              {calendarOn && view === "calendar" ? (
                <section className="mt-4">
                  <div className="mb-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={downloadSnapshot} disabled={snapping}>
                      <Camera className="mr-1.5 size-3.5" />
                      {snapping ? "Creating image…" : "Download snapshot"}
                    </Button>
                  </div>
                  <RosterCalendar
                    creators={calendarCreators}
                    events={calendarEvents}
                    month={calMonth}
                    onMonthChange={setCalMonth}
                    onPick={(id) => {
                      setView("list");
                      setTimeout(() => {
                        const el = document.getElementById(`creator-${id}`);
                        el?.closest("details")?.setAttribute("open", "");
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 50);
                    }}
                  />
                  <div ref={snapRef} aria-hidden style={{ position: "fixed", top: 0, left: -10000 }}>
                    <CalendarSnapshotContent
                      title={roster.title}
                      month={snapMonth}
                      creators={calendarCreators}
                      events={calendarEvents}
                    />
                  </div>
                </section>
              ) : calendarOn && view === "notes" ? (
                <section className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {activeItems.length} creator{activeItems.length === 1 ? "" : "s"} — copy this rundown for internal updates.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(notesText);
                          toast.success("Notes copied to clipboard");
                        } catch {
                          toast.error("Couldn't copy — select the text below instead");
                        }
                      }}
                    >
                      <Copy className="mr-1.5 size-3.5" /> Copy notes
                    </Button>
                  </div>
                  {activeItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No creators match the current filters.</p>
                  ) : (
                    <Card>
                      <CardContent className="p-4 sm:p-5">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{notesText}</div>
                      </CardContent>
                    </Card>
                  )}
                </section>
              ) : (
              <>
              <section className="mt-4 space-y-3">
                {!itemsLoaded && items.length === 0 ? (
                  <div className="space-y-3" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
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
              )}
            </>
          );
        })()}

      </main>
      <SiteFooter />
    </div>
  );
}
