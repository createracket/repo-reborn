import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Users, ClipboardList, UserCircle2, ArrowRight, Megaphone, ListChecks, Rocket, ChevronLeft, ChevronRight, Check, Eye } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { readThumbFrame, thumbFrameBgClass, thumbFrameImgStyle } from "@/lib/thumb-frame";
import {
  calculateVibeScore,
  calculateBrandVibe,
  getArtistArchetypeDescription,
} from "@/lib/vibe-check";
import {
  DEFAULT_VIBE_CONFIG,
  loadVibeCheckConfig,
  artistArchetypeKeyFromLabel,
  brandArchetypeKeyFromLabel,
  type VibeCheckConfig,
} from "@/lib/vibe-check-config";

import { BriefStatusBadge } from "@/components/briefs/BriefStatusBadge";
import { formatBriefBudget, transparencyLabel } from "@/lib/brief-currency";
import { BudgetDisplay } from "@/components/briefs/BudgetDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ListeningReportsCard } from "@/components/dashboard/ListeningReportsCard";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Create Racket" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Couldn't load dashboard: {error.message}</div>
  ),
});

type VibeRow = {
  id: string;
  created_at: string;
  result: "artist" | "brand" | "fan" | null;
  answers: any;
  artist_score: number;
  brand_score: number;
};

type RosterRow = {
  id: string;
  member_id: string;
  created_at: string;
  member?: { id: string; display_name: string | null; avatar_url: string | null; account_type: string | null } | null;
};

const CATEGORY_TAG: Record<string, { label: string; badge: string }> = {
  musician: { label: "Musician", badge: "bg-pink-accent text-[#2b2b2b]" },
  ugc: { label: "UGC", badge: "bg-purple text-white" },
  egc: { label: "EGC", badge: "bg-sky-500 text-white" },
  music_fan: { label: "Music Fan", badge: "bg-emerald-500 text-white" },
  editorial: { label: "Editorial", badge: "bg-amber-500 text-white" },
  artist_exchange: { label: "Artist Exchange", badge: "bg-rose-500 text-white" },
};

const ACCOUNT_TYPE_TAG: Record<string, { label: string; badge: string }> = {
  artist: { label: "Artist", badge: "bg-pink-accent text-[#2b2b2b]" },
  brand: { label: "Brand", badge: "bg-purple text-white" },
  fan: { label: "Fan", badge: "bg-emerald-500 text-white" },
  crew: { label: "Crew", badge: "bg-sky-500 text-white" },
  creative: { label: "Creative", badge: "bg-amber-500 text-white" },
};

function TypeTag({ tag }: { tag: { label: string; badge: string } | undefined }) {
  if (!tag) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tag.badge}`}>
      {tag.label}
    </span>
  );
}

type CommunityMember = {
  id: string;
  display_name: string;
  account_type: "artist" | "brand" | "fan";
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
};

type Opportunity = {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  currency?: string | null;
  transparency?: string | null;
  published_at: string | null;
  created_at: string;
  brief_source: "user" | "lead";
  artist_archetypes?: string[] | null;
  brand_archetypes?: string[] | null;
  display_order?: number | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileRow, setProfileRow] = useState<{ slug: string | null; avatar_url: string | null; bio: string | null; display_name: string | null } | null>(null);
  const [latestVibe, setLatestVibe] = useState<VibeRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [community, setCommunity] = useState<CommunityMember[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [examples, setExamples] = useState<Array<{ id: string; title: string; description: string | null; location: string | null; image_url: string | null }>>([]);
  const [spotlightOpps, setSpotlightOpps] = useState<Array<{ id: string; slug: string; headline: string; subtitle: string | null; type: string | null; header_image_url: string | null; profile_image_url: string | null; section?: string | null; links?: any }>>([]);
  const [plannerBriefs, setPlannerBriefs] = useState<Array<{ id: string; slug: string; headline: string; subtitle: string | null; type: string | null; header_image_url: string | null; profile_image_url: string | null; links?: any }>>([]);
  const [assignedRosters, setAssignedRosters] = useState<Array<{ id: string; title: string; slug: string | null; published: boolean; updated_at: string }>>([]);
  const [assignedReports, setAssignedReports] = useState<Array<{ id: string; title: string; slug: string; published: boolean; updated_at: string }>>([]);
  const [taggedCreators, setTaggedCreators] = useState<Array<{ id: string; name: string | null; avatar_url: string | null; category: string | null; roster_id: string; roster_title: string; roster_slug: string | null; roster_published: boolean }>>([]);
  const [myBriefs, setMyBriefs] = useState<Array<{ id: string; title: string; created_at: string; status: string | null; budget: number | null; currency: string | null; linked_roster_id: string | null; linked_roster_slug: string | null; linked_roster_published: boolean; linked_report_slug: string | null; linked_report_published: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [rosterFilter, setRosterFilter] = useState<string>("mine");
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "paid">("free");
  const [adminViewAsTier, setAdminViewAsTier] = useState<"free" | "paid">("paid");
  const [myRosters, setMyRosters] = useState<Array<{ id: string; title: string }>>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const oppCarouselRef = useRef<HTMLDivElement>(null);

  const soundBoardRef = useRef<HTMLDivElement>(null);
  const [rosterItems, setRosterItems] = useState<Array<{ id: string; name: string | null; avatar_url: string | null; category: string | null; roster_id: string; roster_title: string }>>([]);
  const [soundBoardItems, setSoundBoardItems] = useState<Array<{ id: string; title: string; copy: string; video_url: string | null; thumbnail_url: string | null; gradient: string | null }>>([]);

  // Sound board is the last section on the page — load it only once the rest of the dashboard has settled
  useEffect(() => {
    if (loading) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("sound_board_items")
        .select("id,title,copy,video_url,thumbnail_url,gradient,position,published")
        .eq("published", true)
        .order("position", { ascending: true });
      setSoundBoardItems(((data as any[]) ?? []) as any);
    })();
  }, [loading]);

  const isAllView = rosterFilter === "all";
  const isMineView = rosterFilter === "mine";
  const isRosterView = !isAllView && !isMineView;
  // Saved-member rows show on "All" and "My saved roster"; hidden on individual roster view
  const displayedRoster = isRosterView ? [] : roster;

  // Load rosters available for the toggle — own rosters + rosters shared with the user; admins see all
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      let rows: any[] = [];
      if (isAdmin) {
        const { data } = await (supabase as any)
          .from("rosters")
          .select("id, title, owner_id")
          .order("updated_at", { ascending: false });
        rows = (data ?? []) as any[];
      } else {
        // Own rosters
        const { data: own } = await (supabase as any)
          .from("rosters")
          .select("id, title, owner_id")
          .eq("owner_id", u.user.id)
          .order("updated_at", { ascending: false });
        // Rosters shared with the user via roster_shares (tagged)
        const { data: shares } = await (supabase as any)
          .from("roster_shares")
          .select("roster_id")
          .eq("user_id", u.user.id);
        const sharedIds = Array.from(new Set(((shares ?? []) as any[]).map((s) => s.roster_id)));
        let shared: any[] = [];
        if (sharedIds.length) {
          const { data } = await (supabase as any)
            .from("rosters")
            .select("id, title, owner_id")
            .in("id", sharedIds)
            .order("updated_at", { ascending: false });
          shared = (data ?? []) as any[];
        }
        const seen = new Set<string>();
        rows = [...(own ?? []), ...shared].filter((r: any) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
      }

      const otherOwnerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter((id) => id && id !== u.user!.id)));
      let ownerNames = new Map<string, string>();
      if (otherOwnerIds.length) {
        const { data: profs } = await (supabase as any)
          .from("public_profiles")
          .select("id, display_name")
          .in("id", otherOwnerIds);
        ownerNames = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.display_name]));
      }
      setMyRosters(rows.map((r: any) => ({
        id: r.id,
        title: r.owner_id !== u.user!.id
          ? `${r.title} — ${ownerNames.get(r.owner_id) ?? "Shared"}`
          : r.title,
      })));
    })();
  }, [isAdmin]);



  // Load items for a specific owned roster when selected
  useEffect(() => {
    if (!isRosterView) { setRosterItems([]); return; }
    (async () => {
      const selected = myRosters.find((r) => r.id === rosterFilter);
      const { data: items } = await (supabase as any)
        .from("roster_items")
        .select("id, name, avatar_url, category, roster_id, position")
        .eq("roster_id", rosterFilter)
        .order("position", { ascending: true });
      setRosterItems(((items ?? []) as any[]).map((it) => ({
        id: it.id,
        name: it.name,
        avatar_url: it.avatar_url,
        category: it.category,
        roster_id: it.roster_id,
        roster_title: selected?.title ?? "",
      })));
    })();
  }, [rosterFilter, isRosterView, myRosters]);


  const [vibeConfig, setVibeConfig] = useState<VibeCheckConfig>(DEFAULT_VIBE_CONFIG);
  useEffect(() => {
    loadVibeCheckConfig(true).then(setVibeConfig).catch(() => {});
  }, []);

  useEffect(() => {

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? null);
      if (!u.user) return;

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleRow);

      const { data: tierRow } = await (supabase as any)
        .from("profiles")
        .select("subscription_tier")
        .eq("id", u.user.id)
        .maybeSingle();
      setSubscriptionTier(((tierRow as any)?.subscription_tier === "paid" ? "paid" : "free"));

      // Auto-enrol new accounts into the mailing list
      if (u.user.email) {
        const { data: existing } = await supabase
          .from("mailing_list_subscribers")
          .select("id")
          .eq("email", u.user.email)
          .maybeSingle();
        if (!existing) {
          await supabase.from("mailing_list_subscribers").insert({
            email: u.user.email,
            name: u.user.user_metadata?.full_name ?? u.user.user_metadata?.name ?? null,
            source: "account-creation",
            marketing_opt_in: true,
          });
        }
      }

      const [{ data: vibes }, { data: rosterRows }, { data: communityRows }, { data: featuredRows }, { data: profile }, { data: opps }] = await Promise.all([
        supabase
          .from("vibe_check_responses")
          .select("id, created_at, result, answers, artist_score, brand_score")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("roster_members")
          .select("id, member_id, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("community_profiles")
          .select("id, display_name, account_type, tagline, location, avatar_url")
          .order("created_at", { ascending: false })
          .limit(8),
        (supabase as any)
          .from("public_profiles")
          .select("id, display_name, artist_name, account_type, bio, location, avatar_url")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("profiles")
          .select("display_name, slug, avatar_url, bio")
          .eq("id", u.user.id)
          .single(),
        supabase
          .from("campaign_briefs")
          .select("id, title, description, budget, currency, transparency, published_at, created_at, artist_archetypes, brand_archetypes, status, display_order")
          .eq("published", true)
          .neq("status", "closed")
          .order("display_order", { ascending: true })
          .order("published_at", { ascending: false })
          .limit(50),
      ]);

      // Briefs the current user submitted (Project Planner)
      const { data: mineBriefs } = await (supabase as any)
        .from("campaign_briefs")
        .select("id, title, created_at, status, budget, currency, thumbnail_url, linked_roster_id, linked_report_id")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      const mineBriefRows = (((mineBriefs as any[]) ?? [])).filter((r) => r?.status !== "closed");

      const linkedRosterIds = Array.from(
        new Set(mineBriefRows.map((r) => r.linked_roster_id).filter(Boolean) as string[]),
      );
      let rosterInfo = new Map<string, { slug: string | null; published: boolean }>();
      if (linkedRosterIds.length) {
        const { data: rosterRows } = await (supabase as any)
          .from("rosters")
          .select("id, slug, published")
          .in("id", linkedRosterIds);
        ((rosterRows ?? []) as any[]).forEach((r) =>
          rosterInfo.set(r.id, { slug: r.slug ?? null, published: !!r.published }),
        );
      }
      const linkedReportIds = Array.from(
        new Set(mineBriefRows.map((r) => r.linked_report_id).filter(Boolean) as string[]),
      );
      const reportInfo = new Map<string, { slug: string | null; published: boolean }>();
      if (linkedReportIds.length) {
        const { data: reportRows } = await (supabase as any)
          .from("campaign_reports")
          .select("id, slug, published")
          .in("id", linkedReportIds);
        ((reportRows ?? []) as any[]).forEach((r) =>
          reportInfo.set(r.id, { slug: r.slug ?? null, published: !!r.published }),
        );
      }
      setMyBriefs(
        mineBriefRows.map((r) => {
          const info = r.linked_roster_id ? rosterInfo.get(r.linked_roster_id) : null;
          const rep = r.linked_report_id ? reportInfo.get(r.linked_report_id) : null;
          return {
            id: r.id,
            title: r.title,
            created_at: r.created_at,
            status: r.status,
            budget: r.budget,
            currency: r.currency,
            thumbnail_url: r.thumbnail_url ?? null,
            linked_roster_id: r.linked_roster_id ?? null,
            linked_roster_slug: info?.slug ?? null,
            linked_roster_published: !!info?.published,
            linked_report_slug: rep?.slug ?? null,
            linked_report_published: !!rep?.published,
          };
        }),
      );

      setDisplayName(profile?.display_name ?? null);
      setProfileRow((profile as any) ?? null);
      setLatestVibe((vibes?.[0] as VibeRow) ?? null);

      // Assigned rosters + reports render directly under the planner, so load them next
      if (u.user.email) {
        const { data: assigned } = await (supabase as any).rpc("get_assigned_rosters");
        setAssignedRosters(((assigned as any[]) ?? []) as any);
        const { data: assignedRep } = await (supabase as any).rpc("get_assigned_campaign_reports");
        setAssignedReports(((assignedRep as any[]) ?? []) as any);
      }

      // Merge in privately shared briefs (both user + lead briefs)
      const { data: shares } = await supabase
        .from("campaign_brief_shares")
        .select("brief_source, brief_id");
      const shareUserIds = ((shares ?? []) as any[]).filter((s) => s.brief_source === "user").map((s) => s.brief_id as string);
      const shareLeadIds = ((shares ?? []) as any[]).filter((s) => s.brief_source === "lead").map((s) => s.brief_id as string);
      const [sharedUser, sharedLead] = await Promise.all([
        shareUserIds.length
          ? supabase.from("campaign_briefs").select("id, title, description, budget, currency, transparency, published_at, created_at, status, display_order").in("id", shareUserIds).neq("status", "closed")
          : Promise.resolve({ data: [] as any[] }),
        shareLeadIds.length
          ? (supabase as any).from("lead_briefs_shared").select("id, title, description, budget, currency, transparency, created_at, status, display_order").in("id", shareLeadIds).neq("status", "closed")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const publishedRowsAll = (((opps as any[]) ?? []) as any[]).map((r) => ({ ...r, brief_source: "user" as const })) as Opportunity[];

      // Filter published opportunities by archetype match against the current user's Vibe Check.
      // If a brief has no archetypes set, it's visible to everyone (backwards compatible).
      // Privately shared briefs (below) always bypass this filter.
      const latestVibe = (vibes?.[0] as VibeRow | undefined) ?? null;
      const cfg = await loadVibeCheckConfig().catch(() => DEFAULT_VIBE_CONFIG);
      let userArchetypeKeys: string[] = [];
      let userVibeKind: "artist" | "brand" | "fan" | null = latestVibe?.result ?? null;
      if (latestVibe) {
        if (latestVibe.result === "brand") {
          const scoring: any = calculateBrandVibe(latestVibe.answers ?? {}, cfg);
          const name = scoring?.brandArchetype?.type;
          const key = name ? brandArchetypeKeyFromLabel(name, cfg) : null;
          if (key) userArchetypeKeys = [key];
        } else if (latestVibe.result === "artist") {
          const scoring: any = calculateVibeScore(latestVibe.answers ?? {}, cfg);
          userArchetypeKeys = [scoring?.primary, scoring?.secondary]
            .filter(Boolean)
            .map((n) => artistArchetypeKeyFromLabel(n as string, cfg))
            .filter(Boolean) as string[];
        }
      }
      const publishedRows = publishedRowsAll.filter((r) => {
        const artistList = (r.artist_archetypes ?? []) as string[];
        const brandList = (r.brand_archetypes ?? []) as string[];
        const hasAnyFilter = artistList.length > 0 || brandList.length > 0;
        if (!hasAnyFilter) return true;
        if (!userVibeKind || userArchetypeKeys.length === 0) return false;
        const relevantList = userVibeKind === "brand" ? brandList : artistList;
        if (relevantList.length === 0) return false;
        const relevantKeys = relevantList
          .map((v) =>
            userVibeKind === "brand"
              ? brandArchetypeKeyFromLabel(v, cfg)
              : artistArchetypeKeyFromLabel(v, cfg),
          )
          .filter(Boolean) as string[];
        return userArchetypeKeys.some((k) => relevantKeys.includes(k));
      });

      const sharedRows: Opportunity[] = [
        ...(((sharedUser as any).data ?? []) as any[]).map((r) => ({ ...r, brief_source: "user" as const })),
        ...(((sharedLead as any).data ?? []) as any[]).map((r) => ({ ...r, published_at: null, brief_source: "lead" as const })),
      ];
      const dedup = new Map<string, Opportunity>();
      [...publishedRows, ...sharedRows].forEach((o) => dedup.set(`${o.brief_source}:${o.id}`, o));
      setOpportunities(
        Array.from(dedup.values()).sort((a, b) => {
          const ao = a.display_order ?? 0;
          const bo = b.display_order ?? 0;
          if (ao !== bo) return ao - bo;
          return (a.published_at ?? a.created_at) < (b.published_at ?? b.created_at) ? 1 : -1;
        }),
      );

      const { data: exOpps } = await supabase
        .from("example_opportunities" as any)
        .select("id, title, description, location, image_url")
        .order("position", { ascending: true });
      setExamples(((exOpps as any[]) ?? []) as any);

      // Spotlights & briefs: live-for-all + privately shared to this user (via RLS)
      const pageCols =
        "id, slug, headline, subtitle, type, header_image_url, profile_image_url, section, dashboard_placement, links";
      const [{ data: livePages }, { data: spotlightShareRows }] = await Promise.all([
        (supabase as any)
          .from("partner_pages")
          .select(pageCols)
          .eq("published", true)
          .eq("dashboard_visible", true)
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("partner_page_shares")
          .select("partner_page_id"),
      ]);
      const sharedIds = Array.from(new Set(((spotlightShareRows ?? []) as any[]).map((r) => r.partner_page_id as string)));
      let sharedPages: any[] = [];
      if (sharedIds.length) {
        const { data } = await (supabase as any)
          .from("partner_pages")
          .select(pageCols)
          .eq("published", true)
          .in("id", sharedIds);
        sharedPages = (data ?? []) as any[];
      }
      const dedupSp = new Map<string, any>();
      [...((livePages ?? []) as any[]), ...sharedPages].forEach((s) => dedupSp.set(s.id, s));
      const allPages = Array.from(dedupSp.values());
      const isBrief = (r: any) => (r.section ?? "spotlight") === "brief";
      const placement = (r: any) => (r.dashboard_placement ?? "planner") as string;
      setSpotlightOpps(allPages.filter((r) => !isBrief(r) || placement(r) !== "planner"));
      setPlannerBriefs(allPages.filter((r) => isBrief(r) && placement(r) !== "spotlight"));






      const featuredMembers: CommunityMember[] = ((featuredRows ?? []) as any[]).map((p) => ({
        id: p.id,
        display_name: p.artist_name || p.display_name || "Member",
        account_type: (p.account_type ?? "artist") as CommunityMember["account_type"],
        tagline: p.bio ?? null,
        location: p.location ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
      setCommunity([...featuredMembers, ...((communityRows as CommunityMember[]) ?? [])].slice(0, 12));

      if (rosterRows && rosterRows.length) {
        const memberIds = rosterRows.map((r) => r.member_id);
        const { data: profilesData } = await (supabase as any)
          .from("public_profiles")
          .select("id, display_name, avatar_url, account_type")
          .in("id", memberIds);
        const profiles = (profilesData ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null; account_type: string | null }>;
        const byId = new Map(profiles.map((p) => [p.id, p]));
        setRoster(
          rosterRows.map((r) => ({ ...r, member: byId.get(r.member_id) ?? null }))
        );
      } else {
        setRoster([]);
      }

      // Rosters the user has been tagged on → surface those creators here
      const { data: sharedRosters } = await supabase
        .from("rosters")
        .select("id, title, slug, published")
        .order("updated_at", { ascending: false });
      const sharedList = (sharedRosters ?? []) as Array<{ id: string; title: string; slug: string | null; published: boolean }>;
      // Only list rosters owned by others (RLS returns shared + owned; hide owned to avoid duplication)
      const { data: mine } = await supabase.from("rosters").select("id").eq("owner_id", u.user.id);
      const ownedIds = new Set(((mine ?? []) as Array<{ id: string }>).map((r) => r.id));
      const sharedOnly = sharedList.filter((r) => !ownedIds.has(r.id));
      if (sharedOnly.length) {
        const rosterIds = sharedOnly.map((r) => r.id);
        const { data: items } = await supabase
          .from("roster_items")
          .select("id, name, avatar_url, roster_id, category")
          .in("roster_id", rosterIds)
          .order("position", { ascending: true });
        const byRoster = new Map(sharedOnly.map((r) => [r.id, r]));
        setTaggedCreators(
          ((items ?? []) as any[]).map((it) => {
            const r = byRoster.get(it.roster_id)!;
            return {
              id: it.id,
              name: it.name,
              avatar_url: it.avatar_url,
              category: it.category ?? null,
              roster_id: it.roster_id,
              roster_title: r.title,
              roster_slug: r.slug,
              roster_published: r.published,
            };
          }),
        );
      } else {
        setTaggedCreators([]);
      }
      setLoading(false);
    })();
  }, []);

  // Live-update the suggested matches when an admin edits community profiles
  useEffect(() => {
    const channel = supabase
      .channel("community_profiles_dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_profiles" },
        async () => {
          const { data } = await supabase
            .from("community_profiles")
            .select("id, display_name, account_type, tagline, location, avatar_url")
            .order("created_at", { ascending: false })
            .limit(8);
          setCommunity((data as CommunityMember[]) ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function removeFromRoster(id: string) {
    const { error } = await supabase.from("roster_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRoster((r) => r.filter((x) => x.id !== id));
    toast.success("Removed from roster");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">
              {displayName ?? email ?? "Your dashboard"}
            </h1>
          </div>
        </div>

        <SetupChecklist
          loading={loading}
          hasVibe={!!latestVibe}
          profileComplete={!!profileRow?.slug && !!profileRow?.avatar_url && !!(profileRow?.display_name || displayName) && !!profileRow?.bio}
          hasSlug={!!profileRow?.slug}
          hasAvatar={!!profileRow?.avatar_url}
          hasBio={!!profileRow?.bio}
        />



        <div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-3">
          {/* VIBE CARD (spans 2) */}
          <div className="lg:col-span-2">
            <VibeCard loading={loading} vibe={latestVibe} config={vibeConfig} />
          </div>

          {/* QUICK ACTIONS */}
          <Card className="border-pink-accent">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start bg-pink-accent text-primary-foreground hover:bg-pink-accent/90">
                <Link to="/profile">
                  <UserCircle2 className="mr-2 size-4" /> Edit your profile
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/connect">
                  <ClipboardList className="mr-2 size-4" /> Submit a brief
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/contact">
                  <ClipboardList className="mr-2 size-4" /> Contact the team
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* PROJECT PLANNER */}
          <div className="lg:col-span-3">
            <Card className="bg-[#c8c584]/20 border-[#c8c584]/40">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-2xl flex items-center gap-2">
                      <Rocket className="size-5 text-primary" /> Project planner
                    </CardTitle>
                    <CardDescription>
                      Kick off a campaign by submitting a brief. We'll take it from review through to
                      roster and reporting - track every step here.
                    </CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/connect">
                      <ClipboardList className="mr-2 size-4" />
                      {myBriefs.length === 0 ? "Submit a brief" : "Submit another brief"}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {plannerBriefs.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Briefs for you
                    </div>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {plannerBriefs.map((bp) => {
                        const thumb = bp.header_image_url || bp.profile_image_url || null;
                        const frame = readThumbFrame(bp.links);
                        return (
                          <li key={bp.id}>
                            <Link
                              to="/brief/$slug"
                              params={{ slug: bp.slug }}
                              className="group flex h-full gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:border-primary/60"
                            >
                              <div className={`size-16 shrink-0 overflow-hidden rounded-lg ${thumbFrameBgClass(frame)}`}>
                                {thumb ? (
                                  <img src={thumb} alt="" className="size-full" style={thumbFrameImgStyle(frame)} />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-[9px] uppercase tracking-wider text-muted-foreground">
                                    Brief
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-medium leading-tight group-hover:text-primary">
                                  {bp.headline}
                                </h3>
                                {bp.subtitle ? (
                                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{bp.subtitle}</p>
                                ) : null}
                                <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                                  Brief
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : myBriefs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                    <p className="text-muted-foreground">
                      You haven't submitted a brief yet. Start your first project — it takes a couple
                      of minutes.
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {myBriefs.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium leading-tight truncate">{b.title}</h3>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Submitted {new Date(b.created_at).toLocaleDateString()}
                              {b.budget ? ` · ${formatBriefBudget(b.budget, b.currency)}` : ""}
                            </div>
                          </div>
                          <BriefStatusBadge
                            status={b.status}
                            className="bg-secondary !text-white dark:!text-white border-transparent hover:bg-secondary"
                            href={
                              b.status === "review_your_roster" && b.linked_roster_slug && b.linked_roster_published
                                ? `/roster/${b.linked_roster_slug}`
                                : b.status === "review_your_report" && b.linked_report_slug && b.linked_report_published
                                  ? `/report/${b.linked_report_slug}`
                                  : null
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <ListeningReportsCard />
          </div>


          {assignedRosters.length > 0 && (
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-2xl flex items-center gap-2">
                    <ListChecks className="size-5 text-primary" /> Your campaign rosters
                  </CardTitle>
                  <CardDescription>
                    Rosters we've built for your campaigns. Click through to review the creators we've shortlisted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {assignedRosters.map((r) => (
                      <li
                        key={r.id}
                        className={`rounded-xl border border-border/60 bg-card p-4 ${r.published && r.slug ? "hover:bg-muted/50 transition-colors" : ""}`}
                      >
                        {r.published && r.slug ? (
                          <Link to="/roster/$slug" params={{ slug: r.slug }} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(r.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                            <ArrowRight className="size-4 text-muted-foreground" />
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(r.updated_at).toLocaleDateString()}
                                {" · Draft"}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">Not yet published</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {assignedReports.length > 0 && (
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-2xl flex items-center gap-2">
                    <Megaphone className="size-5 text-primary" /> Your campaign reports
                  </CardTitle>
                  <CardDescription>
                    Live performance reports for your campaigns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {assignedReports.map((r) => (
                      <li
                        key={r.id}
                        className={`rounded-xl border border-border/60 bg-card p-4 ${r.published && r.slug ? "hover:bg-muted/50 transition-colors" : ""}`}
                      >
                        {r.published && r.slug ? (
                          <Link to="/report/$slug" params={{ slug: r.slug }} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(r.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                            <ArrowRight className="size-4 text-muted-foreground" />
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{r.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(r.updated_at).toLocaleDateString()}
                                {" · Draft"}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">Not yet published</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}


          {/* NEW OPPORTUNITIES (full width) */}
          <div className="lg:col-span-3">
            {(() => {
              const effectiveTier: "free" | "paid" = isAdmin ? adminViewAsTier : subscriptionTier;
              const isFreeView = effectiveTier === "free";
              return (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-2xl flex items-center gap-2">
                      <Megaphone className="size-5 text-pink-accent" /> New opportunities
                    </CardTitle>
                    <CardDescription>
                      Live briefs from the Racket community. Click to review and express interest, or{" "}
                      <Link to="/contact" className="text-primary hover:underline">contact us</Link>{" "}
                      with any questions.
                    </CardDescription>
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-0.5 text-[11px] uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => setAdminViewAsTier("paid")}
                        className={`rounded-full px-2.5 py-1 transition ${adminViewAsTier === "paid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Paid view
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminViewAsTier("free")}
                        className={`rounded-full px-2.5 py-1 transition ${adminViewAsTier === "free" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Free view
                      </button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isFreeView ? (
                  <div className="rounded-xl border border-dashed border-pink-accent/60 bg-pink-accent/5 p-6 text-center">
                    <p className="font-display text-lg">Unlock access to collabs as a priority subscriber</p>
                    <div className="mt-3">
                      <Button asChild size="sm">
                        <Link to="/pricing">See plans</Link>
                      </Button>
                    </div>
                  </div>
                ) : loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : opportunities.length === 0 && spotlightOpps.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No open opportunities right now — here are the types of briefs we surface.
                  </div>
                ) : opportunities.length === 0 ? null : (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Open briefs
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => {
                            const el = oppCarouselRef.current;
                            if (!el || !el.firstElementChild) return;
                            const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                            el.scrollBy({ left: -tileWidth, behavior: "smooth" });
                          }}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => {
                            const el = oppCarouselRef.current;
                            if (!el || !el.firstElementChild) return;
                            const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                            el.scrollBy({ left: tileWidth, behavior: "smooth" });
                          }}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      ref={oppCarouselRef}
                      className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]"
                    >
                      {opportunities.map((o) => (
                        <div
                          key={`${o.brief_source}:${o.id}`}
                          className="snap-start shrink-0 w-full sm:w-[calc(50%-6px)]"
                        >
                          <OpportunityCard opp={o} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Combined spotlights & examples carousel */}
                {!loading && (spotlightOpps.length > 0 || examples.length > 0) ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Featured spotlights
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => {
                            const el = carouselRef.current;
                            if (!el || !el.firstElementChild) return;
                            const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                            el.scrollBy({ left: -tileWidth, behavior: 'smooth' });
                          }}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => {
                            const el = carouselRef.current;
                            if (!el || !el.firstElementChild) return;
                            const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                            el.scrollBy({ left: tileWidth, behavior: 'smooth' });
                          }}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      ref={carouselRef}
                      className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]"
                    >
                      {spotlightOpps.map((sp) => {
                        const thumb = sp.header_image_url || sp.profile_image_url || null;
                        const frame = readThumbFrame(sp.links);
                        return (
                          <div
                            key={sp.id}
                            className="snap-start shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)]"
                          >
                            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4 h-full">
                              <Link
                                to={(sp.section ?? "spotlight") === "brief" ? "/brief/$slug" : "/spotlight/$slug"}
                                params={{ slug: sp.slug }}
                                className="group flex flex-1 flex-col gap-2"
                              >
                                <div className={`aspect-[16/9] w-full overflow-hidden rounded-lg ${thumbFrameBgClass(frame)}`}>
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      className="size-full transition"
                                      style={thumbFrameImgStyle(frame)}
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {(sp.section ?? "spotlight") === "brief" ? "Brief" : "Spotlight"}
                                    </div>
                                  )}
                                </div>
                                <h3 className="truncate text-sm font-medium leading-tight group-hover:text-primary">{sp.headline}</h3>
                                {sp.subtitle ? (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{sp.subtitle}</p>
                                ) : null}
                                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                  <p className="truncate text-xs text-muted-foreground">
                                    {sp.type ?? ""}
                                  </p>
                                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                                    {(sp.section ?? "spotlight") === "brief" ? "Brief" : "Spotlight"}
                                  </span>
                                </div>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                      {examples.map((ex) => (
                        <div
                          key={ex.id}
                          className="snap-start shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)]"
                        >
                          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4 h-full">
                            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
                              {ex.image_url ? (
                                <img src={ex.image_url} alt="" className="size-full object-cover" />
                              ) : (
                                <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Thumb
                                </div>
                              )}
                            </div>
                            <h3 className="truncate text-sm font-medium leading-tight">{ex.title}</h3>
                            {ex.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {ex.description}
                              </p>
                            ) : null}
                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                              <p className="truncate text-xs text-muted-foreground">
                                {ex.location ? ex.location : ""}
                              </p>
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                                Example
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
              );
            })()}
          </div>


          {/* ROSTER (full width) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Users className="size-5 text-primary" /> Your roster
                </CardTitle>
                <CardDescription>
                  Artists, brands and creators you've saved. Add people from the community
                  to keep your shortlist in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!loading && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Label htmlFor="dash-roster-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
                      View
                    </Label>
                    <Select value={rosterFilter} onValueChange={setRosterFilter}>
                      <SelectTrigger id="dash-roster-filter" className="h-9 w-[260px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        
                        <SelectItem value="mine">My saved roster</SelectItem>
                        {myRosters.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  (() => {
                    const showSaved = isAllView || isMineView;
                    const showTagged = isAllView;
                    const showItems = isRosterView;
                    const isEmpty =
                      (!showSaved || displayedRoster.length === 0) &&
                      (!showTagged || taggedCreators.length === 0) &&
                      (!showItems || rosterItems.length === 0);
                    if (isEmpty) {
                      return (
                        <div className="rounded-xl border border-dashed border-pink-accent/60 bg-pink-accent/5 p-8 text-center">

                          {isRosterView ? (
                            <p className="text-muted-foreground">
                              This roster doesn't have any creators yet.
                            </p>
                          ) : latestVibe ? (
                            <p className="text-muted-foreground">
                              Community browsing is coming soon - we'll start surfacing matches
                              based on your Vibe Check results here.
                            </p>
                          ) : (
                            <>
                              <p className="text-muted-foreground">
                                Your roster is empty. Take the Vibe Check to start surfacing matches.
                              </p>
                              <Button asChild className="mt-4">
                                <Link to="/vibe-check">Take the Vibe Check</Link>
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    }
                    return (
                      <ul className="grid max-h-[21rem] gap-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:overflow-visible sm:pr-0 sm:grid-cols-2 lg:grid-cols-3">
                        {showSaved && displayedRoster.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="size-10 overflow-hidden rounded-full bg-muted">
                                {r.member?.avatar_url ? (
                                  <img
                                    src={r.member.avatar_url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2 flex-wrap">
                                  <span>{r.member?.display_name ?? "Member"}</span>
                                  <TypeTag tag={r.member?.account_type ? ACCOUNT_TYPE_TAG[r.member.account_type] : undefined} />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Added {new Date(r.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromRoster(r.id)}
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                        {showTagged && taggedCreators.map((c) => (
                          <li
                            key={`tag-${c.id}`}
                            className={`rounded-xl border border-border/60 bg-card p-4 ${c.roster_published && c.roster_slug ? "hover:bg-muted/50 transition-colors cursor-pointer" : ""}`}
                          >
                            {c.roster_published && c.roster_slug ? (
                              <Link to="/roster/$slug" params={{ slug: c.roster_slug }} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-10 overflow-hidden rounded-full bg-muted shrink-0">
                                    {c.avatar_url ? (
                                      <img src={c.avatar_url} alt="" className="size-full object-cover" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate flex items-center gap-2">
                                      <span className="truncate">{c.name ?? "Creator"}</span>
                                      <TypeTag tag={c.category ? CATEGORY_TAG[c.category] : undefined} />
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      From {c.roster_title}
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="size-4 text-muted-foreground" />
                              </Link>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-10 overflow-hidden rounded-full bg-muted shrink-0">
                                    {c.avatar_url ? (
                                      <img src={c.avatar_url} alt="" className="size-full object-cover" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate flex items-center gap-2">
                                      <span className="truncate">{c.name ?? "Creator"}</span>
                                      <TypeTag tag={c.category ? CATEGORY_TAG[c.category] : undefined} />
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      From {c.roster_title}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                        {showItems && rosterItems.map((c) => (
                          <li
                            key={`item-${c.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-10 overflow-hidden rounded-full bg-muted shrink-0">
                                {c.avatar_url ? (
                                  <img src={c.avatar_url} alt="" className="size-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate flex items-center gap-2">
                                  <span className="truncate">{c.name ?? "Creator"}</span>
                                  <TypeTag tag={c.category ? CATEGORY_TAG[c.category] : undefined} />
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  From {c.roster_title}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )}


                {/* Suggested matches (merged in) */}
                <div className="mt-8 border-t border-border/60 pt-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    <h3 className="font-display text-xl">Suggested matches</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A taste of who's on Racket - sample artists and brands to give you a feel
                    for the kind of matches we'll surface as the community grows.
                  </p>
                  <div className="mt-4">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : community.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No community members yet.</p>
                    ) : (
                      <ul className="grid max-h-[26rem] gap-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:overflow-visible sm:pr-0 sm:grid-cols-2 lg:grid-cols-4">
                        {community.map((m) => (
                          <li
                            key={m.id}
                            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="size-10 overflow-hidden rounded-full bg-muted">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="size-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{m.display_name}</div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                  {m.account_type}
                                </div>
                              </div>
                            </div>
                            {m.tagline ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{m.tagline}</p>
                            ) : null}
                            {m.location ? (
                              <p className="text-xs text-muted-foreground">{m.location}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SOUND BOARD (full width) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-2xl flex items-center gap-2">
                      <Megaphone className="size-5 text-primary" /> Sound Board
                    </CardTitle>
                    <CardDescription>
                      Case studies, campaign moments and social content worth a look — cycle through for inspiration.
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => {
                        const el = soundBoardRef.current;
                        if (!el || !el.firstElementChild) return;
                        const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                        el.scrollBy({ left: -tileWidth, behavior: "smooth" });
                      }}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => {
                        const el = soundBoardRef.current;
                        if (!el || !el.firstElementChild) return;
                        const tileWidth = (el.firstElementChild as HTMLElement).offsetWidth + 12;
                        el.scrollBy({ left: tileWidth, behavior: "smooth" });
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  ref={soundBoardRef}
                  className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]"
                >
                  {(soundBoardItems.length > 0 ? soundBoardItems : SOUND_BOARD_PLACEHOLDERS).map((item: any, i: number) => {
                    const inner = (
                      <div className="group flex h-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 transition hover:border-pink-accent/60">
                        <div
                          className="w-full overflow-hidden rounded-lg"
                          style={{ aspectRatio: "9 / 16" }}
                        >
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-white/70"
                              style={{ background: item.gradient || "linear-gradient(135deg,#5C37D0,#FFC0CB)" }}
                            >
                              Coming soon
                            </div>
                          )}
                        </div>
                        <h3 className="mt-1 text-sm font-medium leading-tight group-hover:text-pink-accent">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {item.copy}
                        </p>
                      </div>
                    );
                    return (
                      <div
                        key={item.id ?? i}
                        className="snap-start shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)]"
                      >
                        {item.video_url ? (
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-full"
                          >
                            {inner}
                          </a>
                        ) : (
                          inner
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const SOUND_BOARD_PLACEHOLDERS: Array<{ title: string; copy: string; gradient: string }> = [
  { title: "Case study coming soon", copy: "A campaign breakdown showing how a brand and artist collaborated end-to-end.", gradient: "linear-gradient(135deg,#5C37D0,#FFC0CB)" },
  { title: "Social moment", copy: "Example of an unskippable collab clip that landed with real fans.", gradient: "linear-gradient(135deg,#BADA55,#5C37D0)" },
  { title: "Brand x artist story", copy: "Behind-the-scenes look at a partnership from brief to release.", gradient: "linear-gradient(135deg,#FFC0CB,#BADA55)" },
  { title: "Fan-first activation", copy: "How a community-led moment turned into a full campaign.", gradient: "linear-gradient(135deg,#5C37D0,#BADA55)" },
  { title: "UGC that landed", copy: "Creator content that outperformed the paid cut — and why.", gradient: "linear-gradient(135deg,#FFC0CB,#5C37D0)" },
  { title: "Playlist push", copy: "Turning a sync placement into an ongoing streaming story.", gradient: "linear-gradient(135deg,#BADA55,#FFC0CB)" },
  { title: "Tour tie-in", copy: "Aligning brand activations with a live moment for maximum reach.", gradient: "linear-gradient(135deg,#5C37D0,#FFC0CB)" },
  { title: "Feature drop", copy: "How one collab clip became a repeatable content format.", gradient: "linear-gradient(135deg,#BADA55,#5C37D0)" },
];

function VibeCard({ loading, vibe, config }: { loading: boolean; vibe: VibeRow | null; config: VibeCheckConfig }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Your Vibe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (!vibe) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Your Vibe</CardTitle>
          <CardDescription>
            You haven't taken the Vibe Check yet. Takes about 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/vibe-check">Take the Vibe Check</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isBrand = vibe.result === "brand";
  const scoring = isBrand
    ? calculateBrandVibe(vibe.answers ?? {}, config)
    : calculateVibeScore(vibe.answers ?? {}, config);

  const headline = isBrand
    ? (scoring as any).brandArchetype?.type
    : (scoring as any).primary;
  const description = isBrand
    ? (scoring as any).brandArchetype?.description
    : getArtistArchetypeDescription((scoring as any).primary, config);


  return (
    <Card className="lg:h-full">

      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {isBrand ? "Brand archetype" : "Artist archetype"}
            </p>
            <CardTitle className="mt-1 font-display text-3xl">
              <span className="text-gradient-racket">{headline}</span>
            </CardTitle>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/vibe-check">Retake</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}


function SetupChecklist({
  loading,
  hasVibe,
  profileComplete,
  hasSlug,
  hasAvatar,
  hasBio,
}: {
  loading: boolean;
  hasVibe: boolean;
  profileComplete: boolean;
  hasSlug: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
}) {
  if (loading) return null;
  if (profileComplete && hasVibe) return null;

  const items: Array<{ done: boolean; label: string; cta: string; to: "/profile" | "/vibe-check" }> = [];
  if (!hasAvatar) items.push({ done: false, label: "Add a profile photo", cta: "Upload photo", to: "/profile" });
  if (!hasBio) items.push({ done: false, label: "Write a short bio", cta: "Add bio", to: "/profile" });
  if (!hasSlug) items.push({ done: false, label: "Claim your /u/ URL so people can find you", cta: "Pick a URL", to: "/profile" });
  if (!hasVibe) items.push({ done: false, label: "Take the Vibe Check to unlock matches", cta: "Take Vibe Check", to: "/vibe-check" });

  if (items.length === 0) return null;
  const primary = items[0];

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <CardTitle className="font-display text-2xl">Finish setting up your profile</CardTitle>
        </div>
        <CardDescription>
          A complete profile plus your Vibe Check is how brands and collaborators find you. Just a couple of quick steps left.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-3 text-sm">
              <span className="grid size-5 place-items-center rounded-full border border-border/60 bg-background">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              </span>
              <span className="flex-1">{it.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link to={primary.to}>{primary.cta} <ArrowRight className="ml-1.5 size-3.5" /></Link>
          </Button>
          {items.length > 1 ? (
            <Button asChild size="sm" variant="ghost">
              <Link to={items[items.length - 1].to}>{items[items.length - 1].cta}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!open || checked) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setChecked(true);
        return;
      }
      const { data } = await supabase
        .from("brief_interests" as any)
        .select("id")
        .eq("brief_id", opp.id)
        .eq("brief_source", opp.brief_source)
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) setRegistered(true);
      setChecked(true);
    })();
  }, [open, checked, opp.id, opp.brief_source]);

  async function handleRegister() {
    setRegistering(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.info("Sign in to express interest");
      navigate({ to: "/login" });
      return;
    }
    const { error } = await (supabase as any)
      .from("brief_interests")
      .insert({ brief_id: opp.id, brief_source: opp.brief_source, user_id: u.user.id });
    setRegistering(false);
    if (error && !error.message?.toLowerCase().includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setRegistered(true);
    toast.success("Interest registered — we'll be in touch.");
  }

  const posted = new Date(opp.published_at ?? opp.created_at).toLocaleDateString();

  return (
    <>
      <div className="group flex h-full flex-col gap-2 rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-colors hover:border-lime">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-tight transition-colors group-hover:text-pink-accent">{opp.title}</h3>
            {opp.transparency ? (
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {transparencyLabel(opp.transparency)}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {opp.budget ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <BudgetDisplay amount={opp.budget} currency={opp.currency} />
              </span>
            ) : null}
            <Button
              size="sm"
              className="h-7 px-3 bg-pink-accent text-primary-foreground hover:bg-pink-accent/90"
              onClick={() => setOpen(true)}
            >
              <Eye className="mr-1 size-3" /> Suss the vibe
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {opp.description}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl leading-tight pr-6">
              {opp.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {opp.budget ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <BudgetDisplay amount={opp.budget} currency={opp.currency} />
                  </span>
                ) : null}
                {opp.transparency ? (
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {transparencyLabel(opp.transparency)}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted-foreground">Posted {posted}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {opp.description}
            </p>
          </div>

          <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleRegister}
              disabled={registering || registered}
            >
              {registered ? (
                <><Check className="mr-1.5 size-4" /> Interest registered</>
              ) : registering ? (
                "Registering…"
              ) : (
                "Express interest"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
