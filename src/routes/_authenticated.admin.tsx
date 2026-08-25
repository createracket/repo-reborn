import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp, RefreshCw, Plus, X, Archive, Check, GripVertical } from "lucide-react";
import { parseDoLine } from "@/lib/dos-donts";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scrapeProfileFollowers, scrapeSpotifyArtist, scrapeAppleMusicArtist, scrapePostMetrics } from "@/lib/campaign-scrapers.functions";
import { draftSpotlightFromText } from "@/lib/spotlight-draft.functions";
import { adminUploadSpotlightImage } from "@/lib/spotlight-images.functions";
import { isNameMatch, MISMATCH_MESSAGE } from "@/lib/streaming-match";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThumbFrameControls } from "@/components/admin/ThumbFrameControls";
import { DEFAULT_THUMB_FRAME, readThumbFrame, type ThumbFrame } from "@/lib/thumb-frame";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
  adminCreateCommunityProfile,
  adminUpdateCommunityProfile,
  adminSetProfileVisibility,
  adminDeleteCommunityProfile,
  adminAssignEmail,
  adminImportRosterCreators,
} from "@/lib/admin-users.functions";
import { ACCESS_CODE } from "@/routes/login";
import { VibeCheckAdmin } from "@/components/admin/VibeCheckAdmin";
import {
  loadVibeCheckConfig,
  DEFAULT_VIBE_CONFIG,
  artistArchetypeOptions,
  brandArchetypeOptions,
  type VibeCheckConfig,
} from "@/lib/vibe-check-config";
import { calculateVibeScore, calculateBrandVibe } from "@/lib/vibe-check";
import { BriefFormAdmin } from "@/components/admin/BriefFormAdmin";
import { CommunityAdmin } from "@/components/admin/CommunityAdmin";
import { EmailsAdmin } from "@/components/admin/EmailsAdmin";
import { TrafficAdmin } from "@/components/admin/TrafficAdmin";
import { ExampleOpportunitiesAdmin } from "@/components/admin/ExampleOpportunitiesAdmin";
import { FaqsAdmin } from "@/components/admin/FaqsAdmin";
import { SoundBoardAdmin } from "@/components/admin/SoundBoardAdmin";
import { UsageAdmin } from "@/components/admin/UsageAdmin";
import { PartnerPageShares } from "@/components/admin/PartnerPageShares";
import { loadDashboardConfig, saveDashboardConfig } from "@/lib/dashboard-config";
import { BriefStatusBadge, BriefStatusSelect, normalizeStatus, type BriefStatus } from "@/components/briefs/BriefStatusBadge";
import { BriefRosterLink } from "@/components/admin/BriefRosterLink";
import { BriefReportLink } from "@/components/admin/BriefReportLink";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type LeadBrief = {
  id: string; created_at: string; title: string; description: string;
  budget: number | null; timeline: string | null; core_values: string[];
  collaboration_types: string[]; target_audience: string | null;
  contact_email: string; contact_name: string | null; company: string | null;
  status: string;
  linked_roster_id: string | null;
  linked_report_id: string | null;
};
type ContactMsg = { id: string; created_at: string; name: string; email: string; message: string; handled: boolean };
type Subscriber = { id: string; created_at: string; email: string; name: string | null; source: string; marketing_opt_in: boolean };
type Profile = { id: string; email: string | null; display_name: string | null; account_type: string | null; created_at: string; slug: string | null; avatar_url: string | null; is_featured?: boolean | null; subscription_tier?: string | null; vibe_archetype_key?: string | null; vibe_archetype_kind?: string | null; managed?: boolean | null; hidden?: boolean | null };
type VibeRow = { user_id: string; result: string | null; answers: any; created_at: string };

/** Resolve a user's vibe check archetype name, or null when they haven't taken it. */
function vibeArchetypeLabel(p: Profile, vibe: VibeRow | undefined, cfg: VibeCheckConfig): string | null {
  if (p.vibe_archetype_key) {
    const opts = p.vibe_archetype_kind === "brand" ? brandArchetypeOptions(cfg) : artistArchetypeOptions(cfg);
    const hit = opts.find((o) => o.key === p.vibe_archetype_key);
    if (hit) return hit.label;
  }
  if (!vibe) return null;
  try {
    if (vibe.result === "brand") {
      const scoring: any = calculateBrandVibe(vibe.answers ?? {}, cfg);
      return scoring?.brandArchetype?.type ?? "Completed";
    }
    if (vibe.result === "artist") {
      const scoring: any = calculateVibeScore(vibe.answers ?? {}, cfg);
      return scoring?.primary ?? "Completed";
    }
  } catch {
    /* fall through */
  }
  return "Completed";
}
type CampaignBrief = { id: string; created_at: string; title: string; description: string; user_id: string; budget: number | null; status: string; contact_email: string | null; published: boolean; published_at: string | null; linked_roster_id: string | null; linked_report_id: string | null };

type Spotlight = {
  id: string; slug: string; type: string; headline: string; subtitle: string | null;
  published: boolean; dashboard_visible: boolean; created_at: string; links?: Record<string, string> | null;
  archived?: boolean | null;
};

type SpotlightInterest = {
  id: string; created_at: string; partner_page_id: string; user_id: string | null;
  guest_email?: string | null; guest_name?: string | null; handled?: boolean | null;
  profile?: { display_name: string | null; email: string | null } | null;
};


function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leadBriefs, setLeadBriefs] = useState<LeadBrief[]>([]);
  const [contacts, setContacts] = useState<ContactMsg[]>([]);
  const [handledOpen, setHandledOpen] = useState(false);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [userAccountFilter, setUserAccountFilter] = useState<"all" | "account" | "managed">("all");
  const [vibeByUser, setVibeByUser] = useState<Map<string, VibeRow>>(new Map());
  const [vibeConfig, setVibeConfig] = useState<VibeCheckConfig>(DEFAULT_VIBE_CONFIG);
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [editingSpotlight, setEditingSpotlight] = useState<Record<string, any> | null>(null);
  const [spotlightFormOpen, setSpotlightFormOpen] = useState(false);
  const [interests, setInterests] = useState<SpotlightInterest[]>([]);
  const [expandedInterests, setExpandedInterests] = useState<Set<string>>(new Set());
  const [openSpotlights, setOpenSpotlights] = useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const toggleSpotlightOpen = (id: string) => setOpenSpotlights((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const profileByEmail = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => { if (p.email) m.set(p.email.trim().toLowerCase(), p); });
    return m;
  }, [profiles]);
  const lookupProfile = (email?: string | null) => email ? profileByEmail.get(email.trim().toLowerCase()) ?? null : null;



  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);

      loadVibeCheckConfig().then(setVibeConfig).catch(() => undefined);

      const [lb, cm, ml, pr, cb, sp, si, ce, vc] = await Promise.all([
        supabase.from("lead_briefs").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
        supabase.from("mailing_list_subscribers").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email, display_name, account_type, created_at, slug, avatar_url, is_featured, subscription_tier, vibe_archetype_key, vibe_archetype_kind, managed, hidden").order("created_at", { ascending: false }),
        supabase.from("campaign_briefs").select("id, created_at, title, description, user_id, budget, status, published, published_at, linked_roster_id, linked_report_id, currency, transparency").order("created_at", { ascending: false }),
        supabase.from("partner_pages" as any).select("*").eq("section", "spotlight").order("created_at", { ascending: false }),
        supabase.from("spotlight_interests" as any).select("id, created_at, partner_page_id, user_id, guest_email, guest_name, handled").order("created_at", { ascending: false }),
        (supabase as any).rpc("admin_campaign_brief_emails"),
        supabase.from("vibe_check_responses").select("user_id, result, answers, created_at").order("created_at", { ascending: false }),
      ]);
      const vibeMap = new Map<string, VibeRow>();
      (((vc as any).data as VibeRow[] | null) ?? []).forEach((row) => {
        if (row.user_id && !vibeMap.has(row.user_id)) vibeMap.set(row.user_id, row);
      });
      setVibeByUser(vibeMap);
      const emailById = new Map<string, string | null>();
      (((ce as any).data as any[] | null) ?? []).forEach((r: any) => emailById.set(r.id, r.contact_email ?? null));
      const campaignRows = (((cb as any).data as any[]) ?? []).map((c: any) => ({ ...c, contact_email: emailById.get(c.id) ?? null })) as CampaignBrief[];
      setLeadBriefs((lb.data as LeadBrief[]) ?? []);
      setContacts((cm.data as ContactMsg[]) ?? []);
      setSubs((ml.data as Subscriber[]) ?? []);
      setProfiles((pr.data as Profile[]) ?? []);
      setCampaigns(campaignRows);
      setSpotlights((sp.data as unknown as Spotlight[]) ?? []);

      // Hydrate interests with profile info (display name + email)
      const rawInterests = (si.data as unknown as SpotlightInterest[]) ?? [];
      const userIds = Array.from(new Set(rawInterests.map((i) => i.user_id).filter((v): v is string => !!v)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]));
        setInterests(rawInterests.map((i) => ({ ...i, profile: (i.user_id ? map.get(i.user_id) : null) ?? null })));
      } else {
        setInterests(rawInterests);
      }

      setChecking(false);
    })();
  }, [navigate]);

  async function reloadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, display_name, account_type, created_at, slug, avatar_url, is_featured, subscription_tier, vibe_archetype_key, vibe_archetype_kind, managed, hidden")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
  }

  async function refreshSpotlights() {
    const { data } = await supabase
      .from("partner_pages" as any)
      .select("*")
      .eq("section", "spotlight")
      .order("created_at", { ascending: false });
    setSpotlights((data as unknown as Spotlight[]) ?? []);
  }

  const activeSpotlights = spotlights.filter((s) => !s.archived);
  const archivedSpotlights = spotlights.filter((s) => !!s.archived);

  const unhandledContactCount =
    contacts.filter((c) => !c.handled).length + interests.filter((i) => !i.handled).length;
  const spotlightById = new Map(spotlights.map((s) => [s.id, s]));

  async function setInterestHandled(id: string, handled: boolean) {
    setInterests((rows) => rows.map((r) => (r.id === id ? { ...r, handled } : r)));
    const { error } = await supabase.from("spotlight_interests" as any).update({ handled } as any).eq("id", id);
    if (error) {
      setInterests((rows) => rows.map((r) => (r.id === id ? { ...r, handled: !handled } : r)));
      toast.error(error.message);
    }
  }

  async function setContactHandled(id: string, handled: boolean) {
    setContacts((rows) => rows.map((r) => (r.id === id ? { ...r, handled } : r)));
    const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", id);
    if (error) {
      setContacts((rows) => rows.map((r) => (r.id === id ? { ...r, handled: !handled } : r)));
      toast.error(error.message);
    }
  }



  async function setSpotlightArchived(s: Spotlight, archived: boolean) {
    const patch: Record<string, any> = archived
      ? { archived: true, published: false, dashboard_visible: false }
      : { archived: false };
    const { error } = await supabase
      .from("partner_pages" as any)
      .update(patch as any)
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(archived ? "Archived" : "Restored");
    refreshSpotlights();
  }

  function renderSpotlightCard(s: Spotlight) {
    return (
                  <Card key={s.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">
                            <button
                              type="button"
                              onClick={() => toggleSpotlightOpen(s.id)}
                              className="inline-flex items-center gap-2 text-left hover:text-foreground/80"
                            >
                              {openSpotlights.has(s.id) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              <span>{s.headline}</span>
                            </button>
                          </CardTitle>
                          <CardDescription>
                            /spotlight/{s.slug} · {s.type}
                            {s.subtitle ? ` · ${s.subtitle}` : ""}
                          </CardDescription>
                          {s.links?.contact ? (
                            <div className="mt-1">
                              <ProfileChip profile={lookupProfile(s.links.contact)} fallbackEmail={s.links.contact} />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.archived ? "secondary" : s.published ? "default" : "outline"}>
                            {s.archived ? "Archived" : s.published ? "Published" : "Draft"}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/spotlight/${s.slug}`} target="_blank" rel="noreferrer">
                              {s.published ? "View" : "Preview"} <ExternalLink className="ml-1 size-3" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const { data, error } = await supabase
                                .from("partner_pages" as any)
                                .select("*")
                                .eq("id", s.id)
                                .single();
                              if (error) return toast.error(error.message);
                              setEditingSpotlight(data);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            <Pencil className="mr-1 size-3" /> Edit
                          </Button>
                          {!s.archived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from("partner_pages" as any)
                                  .update({ published: !s.published })
                                  .eq("id", s.id);
                                if (error) return toast.error(error.message);
                                toast.success(s.published ? "Unpublished" : "Published");
                                refreshSpotlights();
                              }}
                            >
                              {s.published ? "Unpublish" : "Publish"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSpotlightArchived(s, !s.archived)}
                          >
                            <Archive className="mr-1 size-3" /> {s.archived ? "Restore" : "Archive"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!confirm(`Delete spotlight "${s.headline}"?`)) return;
                              const { error } = await supabase
                                .from("partner_pages" as any)
                                .delete()
                                .eq("id", s.id);
                              if (error) return toast.error(error.message);
                              toast.success("Deleted");
                              refreshSpotlights();
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {openSpotlights.has(s.id) && (
                    <CardContent className="space-y-3 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <div>
                          <Label htmlFor={`sp-live-${s.id}`} className="text-sm font-medium">
                            Live on all dashboards
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {s.dashboard_visible
                              ? "Showing in every signed-in user's opportunities feed."
                              : "Hidden from the general opportunities feed."}
                          </p>
                        </div>
                        <Switch
                          id={`sp-live-${s.id}`}
                          checked={s.dashboard_visible}
                          disabled={!!s.archived}
                          onCheckedChange={async (checked) => {
                            setSpotlights((rows) => rows.map((r) => r.id === s.id ? { ...r, dashboard_visible: checked } : r));
                            const { error } = await supabase
                              .from("partner_pages" as any)
                              .update({ dashboard_visible: checked } as any)
                              .eq("id", s.id);
                            if (error) {
                              setSpotlights((rows) => rows.map((r) => r.id === s.id ? { ...r, dashboard_visible: !checked } : r));
                              toast.error(error.message);
                            } else {
                              toast.success(checked ? "Live on all dashboards" : "Hidden from all dashboards");
                            }
                          }}
                        />
                      </div>
                      <PartnerPageShares partnerPageId={s.id} profiles={profiles} pageTitle={s.headline} pageLink={`/spotlight/${s.slug}`} eventKey="brief_shared" />
                    </CardContent>
                    )}
                    {openSpotlights.has(s.id) && (() => {
                      const rows = interests.filter((i) => i.partner_page_id === s.id);
                      if (rows.length === 0) return null;
                      const isExpanded = expandedInterests.has(s.id);
                      return (
                        <CardContent className="border-t border-border/60 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedInterests((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                            }}
                            className="mb-2 flex w-full items-center justify-between text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                          >
                            <span>Registered interest ({rows.length})</span>
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                          {isExpanded && (
                            <ul className="space-y-1 text-sm">
                              {rows.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                                  <span>
                                    {r.profile?.display_name ?? r.guest_name ?? (r.guest_email ? "Guest" : "Unnamed user")}
                                    {(r.profile?.email ?? r.guest_email) ? <span className="text-muted-foreground"> · {r.profile?.email ?? r.guest_email}</span> : null}
                                    {!r.user_id ? <span className="ml-2 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Guest</span> : null}
                                  </span>

                                  <span className="text-xs text-muted-foreground">
                                    {new Date(r.created_at).toLocaleDateString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      );
                    })()}
                  </Card>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Verifying access…</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-2xl">
                <ShieldAlert className="size-5 text-destructive" /> Restricted
              </CardTitle>
              <CardDescription>This area is admin-only.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Dev view</h1>
            <p className="mt-2 text-muted-foreground">Backend records across the platform.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/roster-builder">Roster Builder →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/briefs">Briefs →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campaign-reports">Campaign Reports →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campaign-builder">Campaign Builder →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/racket-desk">Racket Desk →</Link>
            </Button>
          </div>
        </div>


        <Tabs defaultValue="traffic">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="contact" className="relative">
              Contact ({contacts.length + interests.length})
              {unhandledContactCount > 0 && (
                <span className="absolute -right-1 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground shadow">
                  {unhandledContactCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="users">Users ({profiles.length})</TabsTrigger>
            <TabsTrigger value="mailing">Mailing list ({subs.length})</TabsTrigger>
            
            <TabsTrigger value="brief-form">Brief Form</TabsTrigger>
            <TabsTrigger value="spotlights">Spotlights ({spotlights.length})</TabsTrigger>
            
            <TabsTrigger value="vibe">Vibe Check</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="sound-board">Sound Board</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>


          <TabsContent value="traffic" className="mt-6">
            <TrafficAdmin />
          </TabsContent>





          <TabsContent value="spotlights" className="mt-6 space-y-6">
            <FeaturedSpotlightsToggle />
            <Card>
              <CardHeader>
                <button
                  type="button"
                  onClick={() => {
                    if (editingSpotlight) {
                      setEditingSpotlight(null);
                      setSpotlightFormOpen(false);
                    } else {
                      setSpotlightFormOpen((v) => !v);
                    }
                  }}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div>
                    <CardTitle className="text-lg">
                      {editingSpotlight ? "Edit artist spotlight" : "New artist spotlight"}
                    </CardTitle>
                    <CardDescription>
                      {editingSpotlight
                        ? `Updating /spotlight/${editingSpotlight.slug}`
                        : "Create a partner page. Lives at /spotlight/<slug>."}
                    </CardDescription>
                  </div>
                  {(spotlightFormOpen || editingSpotlight) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </CardHeader>
              {(spotlightFormOpen || editingSpotlight) && (
                <CardContent>
                  <SpotlightForm
                    key={editingSpotlight?.id ?? "new"}
                    editData={editingSpotlight}
                    onCreated={() => {
                      refreshSpotlights();
                      setEditingSpotlight(null);
                      setSpotlightFormOpen(false);
                    }}
                    onCancel={() => {
                      setEditingSpotlight(null);
                      setSpotlightFormOpen(false);
                    }}
                  />
                </CardContent>
              )}
            </Card>

            {activeSpotlights.length === 0 ? <Empty /> : (
              <div className="space-y-3">
                {activeSpotlights.map((s) => renderSpotlightCard(s))}
              </div>
            )}

            {archivedSpotlights.length > 0 ? (
              <div className="mt-8 rounded-lg border border-border/60 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setArchiveOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:text-foreground/80"
                >
                  <span className="uppercase tracking-wider text-muted-foreground">
                    Archived spotlights ({archivedSpotlights.length})
                  </span>
                  {archiveOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {archiveOpen ? (
                  <div className="space-y-3 border-t border-border/60 p-4">
                    {archivedSpotlights.map((s) => renderSpotlightCard(s))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="pt-8 border-t border-border">
              <ExampleOpportunitiesAdmin />
            </div>
          </TabsContent>



          <TabsContent value="users" className="mt-6 space-y-6">
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Soft-launch EARLY ACCESS CODE</CardTitle>
                <CardDescription>
                  Share this code with people you want to let in. Without it,
                  visitors are routed to the waitlist instead of sign-up.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded-md border border-primary/40 bg-background px-3 py-1.5 font-mono text-lg tracking-widest">
                    {ACCESS_CODE}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(ACCESS_CODE);
                      toast.success("Code copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
            <NewUserForm onCreated={reloadProfiles} />
            <CommunityProfileForm onCreated={reloadProfiles} />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Featured in Suggested matches</CardTitle>
                <CardDescription>
                  Toggle a user to surface their public profile on every dashboard's "Suggested matches" card.
                  Users without a public slug won't appear publicly — set one on their profile first.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table headers={["Display name", "Email", "Profile type", "Vibe check", "Slug", "Visible", "Joined", "Subscription", "Featured", ""]}>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="p-3">{p.display_name ?? "—"}</td>
                      <td className="p-3">{p.email ?? "—"}</td>
                      <td className="p-3">
                        {p.account_type ? (
                          <span className="inline-block rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs uppercase tracking-wider">
                            {p.account_type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const label = vibeArchetypeLabel(p, vibeByUser.get(p.id), vibeConfig);
                          return label ? (
                            <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {label}
                            </span>
                          ) : (
                            <span className="inline-block rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                              Pending
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {p.slug ? (
                          <a
                            href={`/u/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                          >
                            <code className="text-xs">/u/{p.slug}</code>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs italic">no slug</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!p.hidden}
                            onCheckedChange={async (checked) => {
                              const prev = profiles;
                              setProfiles((rows) => rows.map((r) => (r.id === p.id ? { ...r, hidden: !checked } : r)));
                              try {
                                await adminSetProfileVisibility({ data: { profile_id: p.id, hidden: !checked } });
                                toast.success(checked ? "Now visible" : "Hidden from public");
                              } catch (e: any) {
                                setProfiles(prev);
                                toast.error(e?.message ?? "Failed to update visibility");
                              }
                            }}
                          />
                          {p.managed ? (
                            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              No account
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        {(() => {
                          const isPaid = p.subscription_tier === "paid";
                          return (
                            <button
                              type="button"
                              onClick={async () => {
                                const next = isPaid ? "free" : "paid";
                                const prev = profiles;
                                setProfiles((rows) => rows.map((r) => r.id === p.id ? { ...r, subscription_tier: next } : r));
                                const { error } = await (supabase as any)
                                  .from("profiles")
                                  .update({ subscription_tier: next })
                                  .eq("id", p.id);
                                if (error) {
                                  setProfiles(prev);
                                  toast.error(error.message);
                                } else {
                                  toast.success(next === "paid" ? "Upgraded to Paid" : "Downgraded to Free");
                                }
                              }}
                              className={`rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-wider transition ${isPaid ? "border-primary bg-primary/15 text-primary hover:bg-primary/25" : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"}`}
                              title={isPaid ? "Click to downgrade to Free" : "Click to upgrade to Paid"}
                            >
                              {isPaid ? "Paid" : "Free"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="p-3">
                        <Switch
                          checked={!!p.is_featured}
                          disabled={!p.slug}
                          onCheckedChange={async (checked) => {
                            const prev = profiles;
                            setProfiles((rows) => rows.map((r) => r.id === p.id ? { ...r, is_featured: checked } : r));
                            const { error } = await supabase
                              .from("profiles")
                              .update({ is_featured: checked })
                              .eq("id", p.id);
                            if (error) {
                              setProfiles(prev);
                              toast.error(error.message);
                            } else {
                              toast.success(checked ? "Now featured" : "Removed from featured");
                            }
                          }}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingProfile(p)}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (!confirm(`Permanently delete user ${p.email ?? p.display_name ?? p.id}? This cannot be undone.`)) return;
                               try {
                                 if (p.managed) await adminDeleteCommunityProfile({ data: { profile_id: p.id } });
                                 else await adminDeleteUser({ data: { user_id: p.id } });
                                 setProfiles((rows) => rows.filter((r) => r.id !== p.id));
                                 toast.success("User removed");
                              } catch (e: any) {
                                toast.error(e?.message ?? "Failed to remove user");
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" /> Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </CardContent>
            </Card>
            <EditUserDialog
              profile={editingProfile}
              open={!!editingProfile}
              onOpenChange={(v) => { if (!v) setEditingProfile(null); }}
              onSaved={(u) => { setProfiles((rows) => rows.map((r) => r.id === u.id ? { ...r, ...u } as Profile : r)); void reloadProfiles(); }}
            />
          </TabsContent>


          <TabsContent value="contact" className="mt-6 space-y-6">
            {(() => {
              const renderInterest = (i: SpotlightInterest) => {
                const s = spotlightById.get(i.partner_page_id);
                const name = i.profile?.display_name ?? i.guest_name ?? (i.guest_email ? "Guest" : "Unnamed user");
                const email = i.profile?.email ?? i.guest_email ?? null;
                return (
                  <Card key={i.id}>
                    <CardHeader>
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{name}</CardTitle>
                          <CardDescription>
                            {email ?? "No email"} · Registered interest in {s?.headline ?? "a spotlight"}
                            {!i.user_id ? " (not signed in)" : ""}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Meta date={i.created_at} status={i.handled ? "handled" : "new"} />
                          <Button size="sm" variant="outline" onClick={() => setInterestHandled(i.id, !i.handled)}>
                            {i.handled ? "Mark new" : "Mark handled"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (!confirm(`Delete interest from ${email ?? name}?`)) return;
                              const { error } = await supabase.from("spotlight_interests" as any).delete().eq("id", i.id);
                              if (error) { toast.error(error.message); return; }
                              setInterests((rows) => rows.filter((r) => r.id !== i.id));
                              toast.success("Interest removed");
                            }}
                          >
                            <Trash2 className="size-3.5" /> Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              };

              const renderMessage = (m: ContactMsg) => (
                <Card key={m.id}>
                  <CardHeader>
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{m.name}</CardTitle>
                        <CardDescription>{m.email}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Meta date={m.created_at} status={m.handled ? "handled" : "new"} />
                        <Button size="sm" variant="outline" onClick={() => setContactHandled(m.id, !m.handled)}>
                          {m.handled ? "Mark new" : "Mark handled"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Delete message from ${m.email}?`)) return;
                            const { error } = await supabase.from("contact_messages").delete().eq("id", m.id);
                            if (error) { toast.error(error.message); return; }
                            setContacts((rows) => rows.filter((r) => r.id !== m.id));
                            toast.success("Message removed");
                          }}
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="whitespace-pre-wrap text-muted-foreground">{m.message}</p>
                  </CardContent>
                </Card>
              );

              const openInterests = interests.filter((i) => !i.handled);
              const openMessages = contacts.filter((m) => !m.handled);
              const doneInterests = interests.filter((i) => i.handled);
              const doneMessages = contacts.filter((m) => m.handled);
              const doneCount = doneInterests.length + doneMessages.length;

              return (
                <>
                  <section className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Spotlight interest ({openInterests.length})
                    </h3>
                    {openInterests.length === 0 ? <Empty /> : openInterests.map(renderInterest)}
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Contact messages ({openMessages.length})
                    </h3>
                    {openMessages.length === 0 ? <Empty /> : openMessages.map(renderMessage)}
                  </section>

                  {doneCount > 0 && (
                    <section className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setHandledOpen((v) => !v)}
                        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
                      >
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          Handled ({doneCount})
                        </span>
                        {handledOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                      {handledOpen && (
                        <div className="space-y-3">
                          {doneInterests.map(renderInterest)}
                          {doneMessages.map(renderMessage)}
                        </div>
                      )}
                    </section>
                  )}
                </>
              );
            })()}
          </TabsContent>



          <TabsContent value="mailing" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table headers={["Email", "Name", "Source", "Opt-in", "Joined", ""]}>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t border-border/60">
                      <td className="p-3">{s.email}</td>
                      <td className="p-3">{s.name ?? "—"}</td>
                      <td className="p-3">{s.source}</td>
                      <td className="p-3">{s.marketing_opt_in ? "Yes" : "No"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Remove ${s.email} from the mailing list?`)) return;
                            const { error } = await supabase
                              .from("mailing_list_subscribers")
                              .delete()
                              .eq("id", s.id);
                            if (error) {
                              toast.error(error.message || "Failed to remove subscriber");
                              return;
                            }
                            setSubs((prev) => prev.filter((x) => x.id !== s.id));
                            toast.success("Subscriber removed");
                          }}
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vibe" className="mt-6">
            <VibeCheckAdmin />
          </TabsContent>

          <TabsContent value="brief-form" className="mt-6">
            <BriefFormAdmin />
          </TabsContent>

          <TabsContent value="community" className="mt-6">
            <CommunityAdmin />
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <EmailsAdmin />
          </TabsContent>

          <TabsContent value="faqs" className="mt-6">
            <FaqsAdmin />
          </TabsContent>

          <TabsContent value="sound-board" className="mt-6">
            <SoundBoardAdmin />
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <UsageAdmin />
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

type UnifiedBrief =
  | ({ source: "user" } & CampaignBrief)
  | ({ source: "lead" } & LeadBrief & { published?: boolean; published_at?: string | null; user_id?: null });

function UnifiedBriefs({
  leads,
  campaigns,
  lookupProfile,
  profiles,
  onLeadStatusChanged,
  onCampaignStatusChanged,
  onCampaignPublishChanged,
  onLeadUpdated,
  onCampaignUpdated,
  onLeadDeleted,
  onCampaignDeleted,
}: {
  leads: LeadBrief[];
  campaigns: CampaignBrief[];
  lookupProfile: (email?: string | null) => Profile | null;
  profiles: Profile[];
  onLeadStatusChanged: (id: string, next: string) => void;
  onCampaignStatusChanged: (id: string, next: string) => void;
  onCampaignPublishChanged: (id: string, published: boolean, published_at: string | null) => void;
  onLeadUpdated: (id: string, patch: Partial<LeadBrief>) => void;
  onCampaignUpdated: (id: string, patch: Partial<CampaignBrief>) => void;
  onLeadDeleted: (id: string) => void;
  onCampaignDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState<UnifiedBrief | null>(null);
  const rows: UnifiedBrief[] = useMemo(() => {
    const list: UnifiedBrief[] = [
      ...campaigns.map((c) => ({ source: "user" as const, ...c })),
      ...leads.map((l) => ({ source: "lead" as const, ...l })),
    ];
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return list;
  }, [leads, campaigns]);


  if (rows.length === 0) return <Empty />;

  async function updateStatus(b: UnifiedBrief, next: BriefStatus) {
    const table = b.source === "user" ? "campaign_briefs" : "lead_briefs";
    const prev = b.status;
    if (b.source === "user") onCampaignStatusChanged(b.id, next);
    else onLeadStatusChanged(b.id, next);
    const { error } = await supabase.from(table).update({ status: next }).eq("id", b.id);
    if (error) {
      toast.error(error.message);
      if (b.source === "user") onCampaignStatusChanged(b.id, prev);
      else onLeadStatusChanged(b.id, prev);
    } else {
      toast.success("Status updated");
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((b) => {
        const isUser = b.source === "user";
        const lead = !isUser ? (b as LeadBrief & { source: "lead" }) : null;
        const camp = isUser ? (b as CampaignBrief & { source: "user" }) : null;
        const profile = isUser
          ? lookupProfile(camp!.contact_email) ?? profiles.find((p) => p.id === camp!.user_id) ?? null
          : lookupProfile(lead!.contact_email);
        return (
          <Card key={`${b.source}-${b.id}`}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <span
                      className={
                        isUser
                          ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary"
                          : "rounded-full border border-border/60 bg-muted/40 px-2 py-0.5"
                      }
                    >
                      {isUser ? "User" : "Lead"}
                    </span>
                    {isUser && camp!.published ? (
                      <Badge className="bg-primary/15 text-primary border-primary/30">
                        Live opportunity
                      </Badge>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(b)}
                    className="text-left hover:underline"
                  >
                    <CardTitle className="text-lg">{b.title}</CardTitle>
                  </button>
                  <CardDescription>
                    {isUser
                      ? camp!.contact_email ?? camp!.user_id
                      : `${lead!.contact_name ?? "—"} · ${lead!.contact_email}${lead!.company ? ` · ${lead!.company}` : ""}`}
                  </CardDescription>
                  <div className="mt-1">
                    <ProfileChip
                      profile={profile}
                      fallbackEmail={isUser ? camp!.contact_email : lead!.contact_email}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()}
                  </div>
                  <BriefStatusBadge status={b.status} />
                  <BriefStatusSelect
                    value={b.status}
                    onChange={(next) => updateStatus(b, next)}
                  />
                  {normalizeStatus(b.status) === "review_your_roster" ? (
                    <BriefRosterLink
                      briefSource={b.source}
                      briefId={b.id}
                      linkedRosterId={b.linked_roster_id}
                      onChange={(nextId) => {
                        if (b.source === "user") onCampaignUpdated(b.id, { linked_roster_id: nextId } as Partial<CampaignBrief>);
                        else onLeadUpdated(b.id, { linked_roster_id: nextId } as Partial<LeadBrief>);
                      }}
                    />
                  ) : null}
                  {normalizeStatus(b.status) === "review_your_report" ? (
                    <BriefReportLink
                      briefSource={b.source}
                      briefId={b.id}
                      linkedReportId={b.linked_report_id}
                      onChange={(nextId) => {
                        if (b.source === "user") onCampaignUpdated(b.id, { linked_report_id: nextId } as Partial<CampaignBrief>);
                        else onLeadUpdated(b.id, { linked_report_id: nextId } as Partial<LeadBrief>);
                      }}
                    />
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete brief "${b.title}"? This cannot be undone.`)) return;
                      const table = b.source === "user" ? "campaign_briefs" : "lead_briefs";
                      const { error } = await supabase.from(table).delete().eq("id", b.id);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      if (b.source === "user") onCampaignDeleted(b.id);
                      else onLeadDeleted(b.id);
                      toast.success("Brief deleted");
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{b.description}</p>
              <KV k="Budget" v={b.budget ? `£${b.budget}` : "—"} />
              {!isUser ? (
                <>
                  <KV k="Timeline" v={lead!.timeline ?? "—"} />
                  <KV k="Audience" v={lead!.target_audience ?? "—"} />
                  <KV k="Values" v={lead!.core_values?.join(", ") || "—"} />
                  <KV k="Collab" v={lead!.collaboration_types?.join(", ") || "—"} />
                </>
              ) : null}
              {isUser ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div>
                    <Label htmlFor={`pub-${b.id}`} className="text-sm font-medium">
                      Publish as opportunity
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {camp!.published
                        ? `Visible to artists${camp!.published_at ? ` since ${new Date(camp!.published_at).toLocaleDateString()}` : ""}.`
                        : "Hidden — only admins can see this brief."}
                    </p>
                  </div>
                  <Switch
                    id={`pub-${b.id}`}
                    checked={camp!.published}
                    onCheckedChange={async (checked) => {
                      const nextPublishedAt = checked ? new Date().toISOString() : null;
                      onCampaignPublishChanged(b.id, checked, nextPublishedAt);
                      const { error } = await supabase
                        .from("campaign_briefs")
                        .update({ published: checked, published_at: nextPublishedAt })
                        .eq("id", b.id);
                      if (error) {
                        onCampaignPublishChanged(b.id, camp!.published, camp!.published_at);
                        toast.error(error.message);
                      } else {
                        toast.success(checked ? "Published to artist dashboards" : "Unpublished");
                      }
                    }}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      <EditBriefDialog
        brief={editing}
        onClose={() => setEditing(null)}
        onSaved={(patch) => {
          if (!editing) return;
          if (editing.source === "user") onCampaignUpdated(editing.id, patch as Partial<CampaignBrief>);
          else onLeadUpdated(editing.id, patch as Partial<LeadBrief>);
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditBriefDialog({
  brief,
  onClose,
  onSaved,
}: {
  brief: UnifiedBrief | null;
  onClose: () => void;
  onSaved: (patch: Record<string, any>) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brief) return;
    if (brief.source === "user") {
      setForm({
        title: brief.title,
        description: brief.description,
        budget: brief.budget ?? "",
        contact_email: brief.contact_email ?? "",
      });
    } else {
      setForm({
        title: brief.title,
        description: brief.description,
        budget: brief.budget ?? "",
        contact_email: brief.contact_email ?? "",
        contact_name: brief.contact_name ?? "",
        company: brief.company ?? "",
        timeline: brief.timeline ?? "",
        target_audience: brief.target_audience ?? "",
      });
    }
  }, [brief]);

  if (!brief) return null;
  const isUser = brief.source === "user";

  async function save() {
    if (!brief) return;
    setSaving(true);
    const table = brief.source === "user" ? "campaign_briefs" : "lead_briefs";
    const patch: Record<string, any> = {
      title: form.title,
      description: form.description,
      budget: form.budget === "" || form.budget == null ? null : Number(form.budget),
      contact_email: form.contact_email || null,
    };
    if (!isUser) {
      patch.contact_name = form.contact_name || null;
      patch.company = form.company || null;
      patch.timeline = form.timeline || null;
      patch.target_audience = form.target_audience || null;
    }
    const { error } = await supabase.from(table).update(patch as any).eq("id", brief.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Brief updated");
    onSaved(patch);
  }

  return (
    <Dialog open={!!brief} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit brief</DialogTitle>
          <DialogDescription>Update the brief details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={5} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget (£)</Label>
              <Input type="number" value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
          </div>
          {!isUser ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact name</Label>
                  <Input value={form.contact_name ?? ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Timeline</Label>
                <Input value={form.timeline ?? ""} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
              </div>
              <div>
                <Label>Target audience</Label>
                <Textarea rows={2} value={form.target_audience ?? ""} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} />
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function Empty() {
  return <p className="text-sm text-muted-foreground">No records yet.</p>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="text-xs"><span className="uppercase tracking-wider text-muted-foreground">{k}:</span> <span>{v}</span></div>;
}
function Meta({ date, status }: { date: string; status: string }) {
  return (
    <div className="text-right text-xs text-muted-foreground">
      <div>{new Date(date).toLocaleString()}</div>
      <div className="mt-1 inline-block rounded-full border border-border/60 px-2 py-0.5">{status}</div>
    </div>
  );
}
function ProfileChip({ profile, fallbackEmail }: {
  profile: { display_name: string | null; slug: string | null; avatar_url: string | null; email: string | null } | null;
  fallbackEmail?: string | null;
}) {
  if (!profile) {
    return fallbackEmail ? (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">No profile</span>
        <span>{fallbackEmail}</span>
      </span>
    ) : null;
  }
  const name = profile.display_name || profile.email || "User";
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="size-4 rounded-full object-cover" />
      ) : (
        <span className="size-4 rounded-full bg-primary/20" />
      )}
      <span className="font-medium">{name}</span>
    </span>
  );
  return profile.slug ? (
    <a href={`/u/${profile.slug}`} target="_blank" rel="noreferrer">{inner}</a>
  ) : inner;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40">
          <tr>{headers.map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Pull the post's preview image from a TikTok / Instagram / YouTube URL. */
function FetchPreviewButton({ url, onFetched }: { url: string; onFetched: (u: string) => void }) {
  const [loading, setLoading] = useState(false);
  const fetchPreview = useServerFn(scrapePostMetrics);

  async function run() {
    const clean = (url ?? "").trim();
    if (!clean) {
      toast.error("Add the post URL first");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchPreview({ data: { url: clean } });
      if (!result.ok) throw new Error(result.error);
      const thumb = result.metrics.thumbnail_url;
      if (!thumb) throw new Error("No preview image available for that link");
      onFetched(thumb);
      toast.success("Preview pulled from link");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't fetch preview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading || !url} onClick={run}>
      <RefreshCw className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Fetching…" : "Fetch preview"}
    </Button>
  );
}


function ImageUploader({
  label, value, onChange, aspect, hint, folder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect: string;
  hint: string;
  folder?: "spotlights" | "video-covers";
}) {
  const [uploading, setUploading] = useState(false);
  const uploadImage = useServerFn(adminUploadSpotlightImage);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
    if (!supportedTypes.includes(file.type as (typeof supportedTypes)[number])) {
      toast.error("Please choose a JPG, PNG, WebP or GIF image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      });
      const { publicUrl } = await uploadImage({
        data: {
          base64,
          contentType: file.type as (typeof supportedTypes)[number],
          folder: folder ?? "spotlights",
        },
      });
      onChange(publicUrl);
      toast.success(`${label} uploaded`);
      e.target.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="overflow-hidden rounded-md border border-border/60 bg-muted/40"
          style={{ width: 140, aspectRatio: aspect }}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {aspect}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          {value ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export const SPOTLIGHT_SECTION_ORDER = [
  { key: "host_bio", label: "Host bio" },
  { key: "audience", label: "Audience" },
  { key: "spotify", label: "Spotify player" },
  { key: "partnership", label: "Partnership" },
  { key: "vibe_check", label: "Vibe check" },
  { key: "dos_donts", label: "Dos and don'ts" },
  { key: "eoi", label: "Expressions of interest" },
  { key: "videos", label: "Watch (videos)" },
  { key: "photos", label: "Photos" },
] as const;

function normaliseSectionOrder(raw: unknown): string[] {
  const all = SPOTLIGHT_SECTION_ORDER.map((s) => s.key as string);
  const given = Array.isArray(raw) ? (raw as string[]).filter((k) => all.includes(k)) : [];
  return [...given, ...all.filter((k) => !given.includes(k))];
}

export function SpotlightForm({
  onCreated,
  editData,
  onCancel,
  section,
}: {
  onCreated: () => void;
  editData?: Record<string, any> | null;
  onCancel?: () => void;
  section?: "spotlight" | "brief";
}) {
  const sectionKind = section ?? "spotlight";
  const isEditing = !!editData;
  const [sectionOrder, setSectionOrder] = useState<string[]>(() =>
    normaliseSectionOrder(editData?.links?.section_order),
  );
  const [thumbFrame, setThumbFrame] = useState<ThumbFrame>(() => readThumbFrame(editData?.links));

  const [dragKey, setDragKey] = useState<string | null>(null);

  function moveSection(from: number, to: number) {
    setSectionOrder((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: editData?.slug ?? "",
    type: editData?.type ?? "podcast",
    headline: editData?.headline ?? "",
    subtitle: editData?.subtitle ?? "",
    intro: editData?.intro ?? "",
    host_bio: editData?.host_bio ?? "",
    partnership_pitch: editData?.partnership_pitch ?? "",
    eoi_opportunities: (editData?.eoi_opportunities ?? []).join("\n"),
    dos_donts: (editData?.dos_donts ?? []).join("\n"),
    audience_segments: (editData?.audience_segments ?? []).join("\n"),
    vibe_tags: (editData?.vibe_tags ?? []).join(", "),
    instagram: editData?.links?.instagram ?? "",
    tiktok: editData?.links?.tiktok ?? "",
    youtube: editData?.links?.youtube ?? "",
    spotify: editData?.links?.spotify ?? "",
    apple_music: editData?.links?.apple_music ?? "",
    twitch: editData?.links?.twitch ?? "",
    facebook: editData?.links?.facebook ?? "",
    x: editData?.links?.x ?? "",
    custom_label: editData?.links?.custom_label ?? "",
    custom_url: editData?.links?.custom_url ?? "",
    spotifyEmbed: editData?.links?.spotifyEmbed ?? "",
    contact: editData?.links?.contact ?? "",
    video1: editData?.links?.video1 ?? "",
    video2: editData?.links?.video2 ?? "",
    video3: editData?.links?.video3 ?? "",
    video4: editData?.links?.video4 ?? "",
    video1_cover: editData?.links?.video1_cover ?? "",
    video2_cover: editData?.links?.video2_cover ?? "",
    video3_cover: editData?.links?.video3_cover ?? "",
    video4_cover: editData?.links?.video4_cover ?? "",
    photo1: editData?.links?.photo1 ?? "",
    photo2: editData?.links?.photo2 ?? "",
    photo3: editData?.links?.photo3 ?? "",
    photo4: editData?.links?.photo4 ?? "",
    header_image_url: editData?.header_image_url ?? "",
    profile_image_url: editData?.profile_image_url ?? "",
    colour_thumbnails: (editData?.links?.colour_thumbnails ?? false) as boolean,
    published: editData?.published ?? false,
    access_code: editData?.access_code ?? "",
    access_code_label: editData?.access_code_label ?? "Access code",
    total_followers: editData?.total_followers?.toString() ?? "",
    total_streams: editData?.total_streams?.toString() ?? "",
    monthly_streams: editData?.monthly_streams?.toString() ?? "",
    avg_reach: editData?.avg_reach?.toString() ?? "",
    avg_engagement: editData?.avg_engagement?.toString() ?? "",
    label_host_bio: editData?.links?.section_labels?.host_bio ?? "",
    label_audience: editData?.links?.section_labels?.audience ?? "",
    label_partnership: editData?.links?.section_labels?.partnership ?? "",
    label_eoi: editData?.links?.section_labels?.eoi ?? "",
    label_videos: editData?.links?.section_labels?.videos ?? "",
    label_members: editData?.links?.section_labels?.members ?? "",
    youtube_name: editData?.links?.youtube_name ?? "",
    apple_music_name: editData?.links?.apple_music_name ?? "",
  });

  function numOrNull(v: string): number | null {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // --- AI draft from a pasted email / info dump (+ live social enrichment) ---
  const draftSpotlight = useServerFn(draftSpotlightFromText);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<typeof form | null>(null);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const [aiHandles, setAiHandles] = useState({
    instagram: "",
    tiktok: "",
    youtube: "",
    x: "",
    twitch: "",
    spotify: "",
  });

  async function runAiDraft() {
    const text = aiText.trim();
    const socials = Object.fromEntries(
      Object.entries(aiHandles)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v),
    ) as Partial<typeof aiHandles>;
    const hasHandles = Object.keys(socials).length > 0;
    if (text.length < 40 && !hasHandles) {
      toast.error("Paste a bit more detail, or add at least one social handle.");
      return;
    }
    setAiBusy(true);
    try {
      const { draft, enrichment } = await draftSpotlight({
        data: {
          text: text.slice(0, 20000),
          ...(hasHandles ? { socials } : {}),
          ...(form.headline ? { artistName: form.headline } : {}),
        },
      });
      const snapshot = form;
      const filled: string[] = [];
      setForm((f) => {
        const next = { ...f };
        const put = (key: keyof typeof f, value: string | undefined, label: string) => {
          if (!value) return;
          (next[key] as string) = value;
          filled.push(label);
        };
        put("headline", draft.headline, "Headline");
        put("subtitle", draft.subtitle, "Subtitle");
        if (!f.slug && draft.slug) put("slug", draft.slug, "Slug");
        put("intro", draft.intro, "Intro");
        put("host_bio", draft.host_bio, "Bio");
        put("partnership_pitch", draft.partnership_pitch, "Partnership pitch");
        if (draft.eoi_opportunities?.length) {
          next.eoi_opportunities = draft.eoi_opportunities.join("\n");
          filled.push("EOI opportunities");
        }
        if (draft.audience_segments?.length) {
          next.audience_segments = draft.audience_segments.join("\n");
          filled.push("Audience segments");
        }
        if (!f.instagram) put("instagram", draft.instagram, "Instagram");
        if (!f.tiktok) put("tiktok", draft.tiktok, "TikTok");
        if (!f.youtube) put("youtube", draft.youtube, "YouTube");
        if (!f.spotify) put("spotify", draft.spotify, "Spotify");
        if (!f.contact) put("contact", draft.contact, "Contact");
        // Live-fetched links and metrics win over anything typed loosely.
        if (enrichment.links.x) put("x", enrichment.links.x, "X");
        if (enrichment.links.twitch) put("twitch", enrichment.links.twitch, "Twitch");
        if (enrichment.total_followers != null)
          put("total_followers", String(enrichment.total_followers), "Total followers");
        if (enrichment.monthly_streams != null)
          put("monthly_streams", String(enrichment.monthly_streams), "Monthly streams");
        if (enrichment.total_streams != null)
          put("total_streams", String(enrichment.total_streams), "Total streams");
        if (!f.profile_image_url && enrichment.avatar_url)
          put("profile_image_url", enrichment.avatar_url, "Profile image");
        return next;
      });
      if (filled.length === 0) {
        toast.error("The AI couldn't pull anything usable from that text.");
        return;
      }
      setAiSnapshot(snapshot);
      setAiFilled(filled);
      if (enrichment.errors.length) toast.warning(enrichment.errors.join(" · "));
      toast.success(`Draft applied — review before saving (${filled.length} fields).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiBusy(false);
    }
  }

  function undoAiDraft() {
    if (!aiSnapshot) return;
    setForm(aiSnapshot);
    setAiSnapshot(null);
    setAiFilled([]);
    toast.success("Reverted to the values before the AI draft.");
  }



  const scrapeProfile = useServerFn(scrapeProfileFollowers);
  const scrapeSpotify = useServerFn(scrapeSpotifyArtist);
  const scrapeApple = useServerFn(scrapeAppleMusicArtist);
  const [syncing, setSyncing] = useState<string | null>(null);
  // Synced per-handle counts. Persisted in links.follower_counts so they survive
  // a save/reload instead of being lost when the editor unmounts.
  const [fetchedCounts, setFetchedCounts] = useState<Record<string, number>>(
    () => (editData?.links?.follower_counts as Record<string, number> | undefined) ?? {},
  );
  // Extra social handles (band members, side projects) — up to 5 per platform.
  const EXTRA_PLATFORMS = ["instagram", "tiktok", "youtube", "spotify", "apple_music", "twitch", "facebook", "x"] as const;
  type ExtraPlatform = (typeof EXTRA_PLATFORMS)[number];
  const [extraLinks, setExtraLinks] = useState<Record<ExtraPlatform, string[]>>(() => ({
    instagram: editData?.links?.instagram_extra ?? [],
    tiktok: editData?.links?.tiktok_extra ?? [],
    youtube: editData?.links?.youtube_extra ?? [],
    spotify: editData?.links?.spotify_extra ?? [],
    apple_music: editData?.links?.apple_music_extra ?? [],
    twitch: editData?.links?.twitch_extra ?? [],
    facebook: editData?.links?.facebook_extra ?? [],
    x: editData?.links?.x_extra ?? [],
  }));
  const [extraNames, setExtraNames] = useState<Record<"youtube", string[]>>(() => ({
    youtube: editData?.links?.youtube_extra_names ?? [],
  }));
  function setExtraName(i: number, v: string) {
    setExtraNames((s) => {
      const next = [...s.youtube];
      while (next.length <= i) next.push("");
      next[i] = v;
      return { youtube: next };
    });
  }
  function addExtra(p: ExtraPlatform) {
    setExtraLinks((s) => (s[p].length >= 5 ? s : { ...s, [p]: [...s[p], ""] }));
  }
  function setExtra(p: ExtraPlatform, i: number, v: string) {
    setExtraLinks((s) => ({ ...s, [p]: s[p].map((x, ix) => (ix === i ? v : x)) }));
  }
  function removeExtra(p: ExtraPlatform, i: number) {
    setExtraLinks((s) => ({ ...s, [p]: s[p].filter((_, ix) => ix !== i) }));
    if (p === "youtube") setExtraNames((s) => ({ youtube: s.youtube.filter((_, ix) => ix !== i) }));
    setFetchedCounts((c) => {
      const next = { ...c };
      delete next[`${p}:${i}`];
      return next;
    });
  }
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [flagState, setFlagState] = useState<{ flagged: boolean; reason: string | null }>(() => ({
    flagged: !!editData?.flagged_streaming_mismatch,
    reason: editData?.flagged_streaming_reason ?? null,
  }));

  async function syncSocial(
    platform: "instagram" | "tiktok" | "youtube" | "twitch" | "facebook" | "x",
    extraIndex?: number,
  ) {
    const key = extraIndex == null ? platform : `${platform}:${extraIndex}`;
    const raw = String(
      (extraIndex == null ? form[platform] : extraLinks[platform][extraIndex]) || "",
    ).trim();
    if (!raw) {
      toast.error(`Enter a ${platform} URL first`);
      return;
    }
    let full = raw;
    if (!/^https?:\/\//i.test(full)) {
      const h = full.replace(/^@/, "");
      if (platform === "instagram") full = `https://instagram.com/${h}`;
      else if (platform === "tiktok") full = `https://tiktok.com/@${h}`;
      else if (platform === "twitch") full = `https://twitch.tv/${h}`;
      else if (platform === "facebook") full = `https://facebook.com/${h}`;
      else if (platform === "x") full = `https://x.com/${h}`;
      else full = `https://youtube.com/@${h}`;
    }
    setSyncing(key);
    try {
      const r = await scrapeProfile({ data: { url: full } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.followers != null) {
        const next = { ...fetchedCounts, [key]: r.followers };
        setFetchedCounts(next);
        // Keep the headline metric in sync automatically so a synced number is
        // never lost just because "Apply sum" wasn't clicked before saving.
        const total = sumSocialCounts(next);
        if (total > 0) set("total_followers", String(total));
        toast.success(`${platform}: ${r.followers.toLocaleString()} followers`);
      } else {
        toast.error("No follower count returned");
      }
    } finally {
      setSyncing(null);
    }
  }

  async function syncSpotify(extraIndex?: number) {
    const key = extraIndex == null ? "spotify" : `spotify:${extraIndex}`;
    const raw = String((extraIndex == null ? form.spotify : extraLinks.spotify[extraIndex]) || "").trim();
    if (!raw) {
      toast.error("Enter a Spotify artist URL first");
      return;
    }
    setSyncing(key);
    try {
      const r = await scrapeSpotify({ data: { url: raw } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const updates: string[] = [];
      if (r.followers != null) {
        setFetchedCounts((c) => ({ ...c, [key]: r.followers ?? 0 }));
        updates.push(`${r.followers.toLocaleString()} followers`);
      }
      if (r.monthly_listeners != null) {
        if (extraIndex == null) set("monthly_streams", String(r.monthly_listeners));
        updates.push(`${r.monthly_listeners.toLocaleString()} monthly listeners`);
      }
      if (r.total_streams != null) {
        if (extraIndex == null) set("total_streams", String(r.total_streams));
        updates.push(`${r.total_streams.toLocaleString()} total streams`);
      }
      if (updates.length === 0) toast.error("No Spotify metrics returned");
      else toast.success(`Spotify: ${updates.join(" · ")}`);
      if (extraIndex == null && r.name && !isNameMatch(r.name, [form.headline, form.slug])) {
        setMismatchWarning(MISMATCH_MESSAGE);
        setFlagState({ flagged: true, reason: `Spotify artist "${r.name}" does not match "${form.headline}".` });
      } else if (extraIndex == null && r.name) {
        setMismatchWarning(null);
      }
    } finally {
      setSyncing(null);
    }
  }

  async function syncApple(extraIndex?: number) {
    const key = extraIndex == null ? "apple" : `apple_music:${extraIndex}`;
    const raw = String((extraIndex == null ? form.apple_music : extraLinks.apple_music[extraIndex]) || "").trim();
    if (!raw) { toast.error("Enter an Apple Music artist URL first"); return; }
    setSyncing(key);
    try {
      const r = await scrapeApple({ data: { url: raw } });
      if (!r.ok) { toast.error(r.error); return; }
      if (extraIndex == null && r.name && !isNameMatch(r.name, [form.headline, form.slug])) {
        setMismatchWarning(MISMATCH_MESSAGE);
        setFlagState({ flagged: true, reason: `Apple Music artist "${r.name}" does not match "${form.headline}".` });
      } else if (extraIndex == null && r.name) {
        setMismatchWarning(null);
      }
      toast.success(r.name ? `Apple Music: ${r.name}` : "Apple Music synced");
    } finally {
      setSyncing(null);
    }
  }

  // Sum main + extra handles across Instagram / TikTok / YouTube.
  function sumSocialCounts(counts: Record<string, number>) {
    return Object.entries(counts)
      .filter(([k]) => /^(instagram|tiktok|youtube|twitch|facebook|x|custom)(:|$)/.test(k))
      .reduce((sum, [, v]) => sum + (v ?? 0), 0);
  }

  function applyTotalFollowers() {
    const total = sumSocialCounts(fetchedCounts);
    if (total <= 0) {
      toast.error("Sync at least one social first");
      return;
    }
    set("total_followers", String(total));
    toast.success(`Total followers set to ${total.toLocaleString()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug || !form.headline) {
      toast.error("Slug and headline are required");
      return;
    }
    setSaving(true);
    const slug = form.slug.toLowerCase().trim().replace(/\s+/g, "-");
    const payload = {
      slug,
      section: sectionKind,
      type: form.type || "podcast",
      headline: form.headline,
      subtitle: form.subtitle || null,
      intro: form.intro || null,
      host_bio: form.host_bio || null,
      partnership_pitch: form.partnership_pitch || null,
      eoi_opportunities: form.eoi_opportunities
        .split("\n").map((s: string) => s.trim()).filter(Boolean),
      ...(sectionKind === "brief"
        ? {
            dos_donts: form.dos_donts
              .split("\n").map((s: string) => s.trim()).filter(Boolean),
          }
        : {}),
      audience_segments: form.audience_segments
        .split("\n").map((s: string) => s.trim()).filter(Boolean),
      vibe_tags: form.vibe_tags
        .split(",").map((s: string) => s.trim()).filter(Boolean),
      links: {
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        spotify: form.spotify,
        apple_music: form.apple_music,
        spotifyEmbed: form.spotifyEmbed,
        contact: form.contact,
        video1: form.video1,
        video2: form.video2,
        video3: form.video3,
        video4: form.video4,
        video1_cover: form.video1_cover,
        video2_cover: form.video2_cover,
        video3_cover: form.video3_cover,
        video4_cover: form.video4_cover,
        photo1: form.photo1,
        photo2: form.photo2,
        photo3: form.photo3,
        photo4: form.photo4,
        instagram_extra: extraLinks.instagram.map((s) => s.trim()).filter(Boolean),
        tiktok_extra: extraLinks.tiktok.map((s) => s.trim()).filter(Boolean),
        youtube_extra: extraLinks.youtube.map((s) => s.trim()).filter(Boolean),
        spotify_extra: extraLinks.spotify.map((s) => s.trim()).filter(Boolean),
        apple_music_extra: extraLinks.apple_music.map((s) => s.trim()).filter(Boolean),
        twitch: form.twitch,
        facebook: form.facebook,
        x: form.x,
        custom_label: form.custom_label,
        custom_url: form.custom_url,
        twitch_extra: extraLinks.twitch.map((s) => s.trim()).filter(Boolean),
        facebook_extra: extraLinks.facebook.map((s) => s.trim()).filter(Boolean),
        x_extra: extraLinks.x.map((s) => s.trim()).filter(Boolean),
        follower_counts: fetchedCounts,
        youtube_name: form.youtube_name.trim(),
        apple_music_name: form.apple_music_name.trim(),
        youtube_extra_names: extraLinks.youtube.map((_, i) => (extraNames.youtube[i] ?? "").trim()),
        colour_thumbnails: form.colour_thumbnails,
        thumb_frame: thumbFrame,
        section_labels: {
          host_bio: form.label_host_bio.trim(),
          audience: form.label_audience.trim(),
          partnership: form.label_partnership.trim(),
          eoi: form.label_eoi.trim(),
          videos: form.label_videos.trim(),
          members: form.label_members.trim(),
        },
        section_order: sectionOrder,
      },
      header_image_url: form.header_image_url || null,
      profile_image_url: form.profile_image_url || null,
      published: form.published,
      access_code: form.access_code.trim() || null,
      access_code_label: form.access_code.trim()
        ? form.access_code_label.trim() || "Access code"
        : null,
      total_followers: numOrNull(form.total_followers),
      total_streams: numOrNull(form.total_streams),
      monthly_streams: numOrNull(form.monthly_streams),
      avg_reach: numOrNull(form.avg_reach),
      avg_engagement: numOrNull(form.avg_engagement),
      ...(flagState.flagged
        ? { flagged_streaming_mismatch: true, flagged_streaming_reason: flagState.reason }
        : {}),
    };

    if (findProfanityIn(payload)) {
      setSaving(false);
      toast.error("Please remove offensive or inappropriate language from the spotlight before saving.");
      return;
    }

    if (isEditing) {
      const { error } = await supabase
        .from("partner_pages" as any)
        .update(payload)
        .eq("id", editData.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Spotlight updated: /spotlight/${slug}`);
    } else {
      const { error } = await supabase.from("partner_pages" as any).insert(payload);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Spotlight created at /spotlight/${slug}`);
      setForm({
        slug: "", type: "podcast", headline: "", subtitle: "", intro: "",
        host_bio: "", partnership_pitch: "", eoi_opportunities: "", dos_donts: "", audience_segments: "", vibe_tags: "",
        instagram: "", tiktok: "", youtube: "", spotify: "", apple_music: "", twitch: "", facebook: "", x: "", custom_label: "", custom_url: "", spotifyEmbed: "", contact: "",
        video1: "", video2: "", video3: "", video4: "",
        video1_cover: "", video2_cover: "", video3_cover: "", video4_cover: "",
        photo1: "", photo2: "", photo3: "", photo4: "",
        header_image_url: "", profile_image_url: "", colour_thumbnails: false, published: false,
        access_code: "", access_code_label: "Access code",
        total_followers: "", total_streams: "", monthly_streams: "",
        avg_reach: "", avg_engagement: "",
        label_host_bio: "", label_audience: "", label_partnership: "", label_eoi: "", label_videos: "",
        label_members: "", youtube_name: "", apple_music_name: "",
      });
      setThumbFrame(DEFAULT_THUMB_FRAME);
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 [&>*]:order-6">
          <div className="!order-1 md:col-span-2 space-y-2 rounded-lg border border-pink-accent/40 bg-muted/30 p-3">
            <Label htmlFor="ai-dump" className="text-sm font-medium">
              Paste artist email / info dump
            </Label>
            <p className="text-xs text-muted-foreground">
              Drop the raw email here and AI will draft the headline, intro, bio, partnership pitch,
              EOI opportunities and audience segments below. Add social handles too and we fetch the
              live profiles first, so the bio is grounded in real links and follower counts. Nothing
              saves until you hit save, so review and edit first.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["instagram", "Instagram"],
                  ["tiktok", "TikTok"],
                  ["youtube", "YouTube"],
                  ["x", "X"],
                  ["twitch", "Twitch"],
                  ["spotify", "Spotify"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`ai-handle-${key}`} className="text-xs text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={`ai-handle-${key}`}
                    value={aiHandles[key]}
                    onChange={(e) => setAiHandles((h) => ({ ...h, [key]: e.target.value }))}
                    placeholder={key === "spotify" ? "Artist URL" : "@handle or URL"}
                  />
                </div>
              ))}
            </div>
            <Textarea
              id="ai-dump"
              rows={6}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste the artist or manager's email here…"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={runAiDraft} disabled={aiBusy}>
                {aiBusy ? "Drafting…" : "Draft spotlight with AI"}
              </Button>
              {aiSnapshot ? (
                <Button type="button" size="sm" variant="ghost" onClick={undoAiDraft}>
                  Undo AI draft
                </Button>
              ) : null}
              {aiFilled.length > 0 ? (
                <span className="text-xs text-muted-foreground">Filled: {aiFilled.join(", ")}</span>
              ) : null}
            </div>
          </div>



          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ymyb-spotlight" />
          </div>
          <div className="space-y-1.5 md:col-span-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Private access code</Label>
                <p className="text-xs text-muted-foreground">
                  Off = link-only: anyone with the link can view it without an email or passcode. It stays
                  out of Google and other search engines either way. On = visitors must enter their email
                  and the code; admins and assigned users always see it normally.
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                Require code
                <Switch
                  checked={!!form.access_code.trim()}
                  onCheckedChange={(on) => set("access_code", on ? "SPOTLIGHT" : "")}
                />
              </label>
            </div>
            {form.access_code.trim() ? (
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="access_code_label" className="text-xs">Code name</Label>
                  <Input
                    id="access_code_label"
                    value={form.access_code_label}
                    onChange={(e) => set("access_code_label", e.target.value)}
                    placeholder="Access code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="access_code" className="text-xs">Code</Label>
                  <Input
                    id="access_code"
                    value={form.access_code}
                    onChange={(e) => set("access_code", e.target.value)}
                    placeholder="e.g. SPOTLIGHT26"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <details className="!order-5 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Images
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (header image &amp; profile photo)
              </span>
            </summary>
            <div className="flex w-full flex-col gap-4 px-4">
              <ImageUploader
                label="Header image"
                value={form.header_image_url}
                onChange={(url) => set("header_image_url", url)}
                aspect="16 / 9"
                hint="16:9 banner shown at the top of the spotlight page. JPG/PNG, up to 8MB."
              />
              <ImageUploader
                label="Profile photo / artwork"
                value={form.profile_image_url}
                onChange={(url) => set("profile_image_url", url)}
                aspect="1 / 1"
                hint="Square headshot or cover artwork. JPG/PNG, up to 8MB."
              />
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <span>
                  <span className="block text-sm font-medium">Colour thumbnails</span>
                  <span className="block text-xs text-muted-foreground">
                    Off = profile photo shows in black &amp; white. On = full colour.
                  </span>
                </span>
                <Switch
                  checked={form.colour_thumbnails}
                  onCheckedChange={(v) => set("colour_thumbnails", v)}
                />
              </label>
              <ThumbFrameControls
                value={thumbFrame}
                onChange={setThumbFrame}
                previewUrl={form.header_image_url || form.profile_image_url || null}
              />
            </div>
          </details>
          <details className="!order-5 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Content
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (type, headline, bio, pitch, EOI &amp; audience)
              </span>
            </summary>
            <div className="grid w-full gap-4 px-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="podcast" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="headline">Headline *</Label>
                <Input id="headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Your Music, Your Business" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input id="subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="UNLOCK REAL FAN INSIGHTS" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="intro">Intro</Label>
                <Textarea id="intro" rows={3} value={form.intro} onChange={(e) => set("intro", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="host_bio">Host bio</Label>
                <Textarea id="host_bio" rows={3} value={form.host_bio} onChange={(e) => set("host_bio", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="partnership_pitch">Partnership pitch</Label>
                <Textarea id="partnership_pitch" rows={3} value={form.partnership_pitch} onChange={(e) => set("partnership_pitch", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eoi">EOI opportunities (one per line)</Label>
                <Textarea id="eoi" rows={4} value={form.eoi_opportunities} onChange={(e) => set("eoi_opportunities", e.target.value)} placeholder={"Podcast sponsors\nBranded Content\nPodcast guests"} />
              </div>
              {sectionKind === "brief" ? (
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="dos_donts">Dos and don'ts (one per line)</Label>
                  <Textarea
                    id="dos_donts"
                    rows={4}
                    value={form.dos_donts}
                    onChange={(e) => set("dos_donts", e.target.value)}
                    placeholder={"+ Tag @brand in the caption\nx Don't mention competitors"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toggles below to switch each line between a green tick and a yellow cross.
                  </p>
                  {form.dos_donts.split("\n").some((l: string) => l.trim()) ? (
                    <div className="space-y-1.5 pt-1">
                      {form.dos_donts.split("\n").map((line: string, i: number) => {
                        const item = parseDoLine(line);
                        if (!item.text) return null;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => {
                                const lines = form.dos_donts.split("\n");
                                const cur = parseDoLine(lines[i] ?? "");
                                lines[i] = `${cur.kind === "do" ? "x" : "+"} ${cur.text}`;
                                set("dos_donts", lines.join("\n"));
                              }}
                            >
                              {item.kind === "do" ? (
                                <Check className="size-3.5 text-green-500" />
                              ) : (
                                <X className="size-3.5 text-yellow-400" />
                              )}
                            </Button>
                            <span className="text-sm text-muted-foreground">{item.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="audience">Audience segments (one per line)</Label>
                <Textarea id="audience" rows={4} value={form.audience_segments} onChange={(e) => set("audience_segments", e.target.value)} />
              </div>
            </div>
          </details>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="vibe_tags">Vibe check tags (comma separated)</Label>
            <Input id="vibe_tags" value={form.vibe_tags} onChange={(e) => set("vibe_tags", e.target.value)} placeholder="Coffee, Sport, Fashion" />
            {form.vibe_tags.trim() ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.vibe_tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string, i: number) => (
                  <span key={i} className="rounded-full border border-border px-3 py-1 text-xs">{t}</span>
                ))}
              </div>
            ) : null}
          </div>
          <details className="!order-2 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Section headings
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (leave blank to use the default wording)
              </span>
            </summary>
            <div className="flex w-full flex-col gap-4 px-4">
              {([
                { k: "label_host_bio", label: "Host bio heading", ph: "About the host" },
                { k: "label_audience", label: "Audience heading", ph: "Who's listening" },
                { k: "label_partnership", label: "Partnership heading", ph: "Partnership" },
                { k: "label_eoi", label: "Expressions of interest heading", ph: "Expressions of interest" },
                { k: "label_videos", label: "Videos heading", ph: "Watch" },
                { k: "label_members", label: "Secondary socials heading", ph: "Meet the members" },
              ] as const).map(({ k, label, ph }) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={k}>{label}</Label>
                  <Input id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
                </div>
              ))}
              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label>Section order</Label>
                <p className="text-xs text-muted-foreground">
                  Drag to reorder — each heading moves with its content. Empty sections stay hidden.
                </p>
                <div className="space-y-1.5">
                  {sectionOrder.map((key, i) => {
                    const meta = SPOTLIGHT_SECTION_ORDER.find((s) => s.key === key);
                    if (!meta) return null;
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => setDragKey(key)}
                        onDragEnd={() => setDragKey(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!dragKey || dragKey === key) return;
                          moveSection(sectionOrder.indexOf(dragKey), i);
                          setDragKey(null);
                        }}
                        className={`flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm ${
                          dragKey === key ? "opacity-50" : ""
                        }`}
                      >
                        <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                        <span className="flex-1">{meta.label}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => moveSection(i, i - 1)}
                          disabled={i === 0}
                          aria-label={`Move ${meta.label} up`}
                        >
                          <ChevronUp className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => moveSection(i, i + 1)}
                          disabled={i === sectionOrder.length - 1}
                          aria-label={`Move ${meta.label} down`}
                        >
                          <ChevronDown className="size-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </details>
          <details className="!order-3 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Social links &amp; handles
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Instagram, TikTok, YouTube, Spotify, Apple Music, Twitch, Facebook, X, other)
              </span>
            </summary>
            <div className="flex w-full flex-col gap-4 px-4">

          {([

            { p: "instagram", label: "Instagram URL", ph: "https://instagram.com/handle", unit: "followers" },
            { p: "tiktok", label: "TikTok URL", ph: "https://tiktok.com/@handle", unit: "followers" },
            { p: "youtube", label: "YouTube URL", ph: "https://youtube.com/@handle", unit: "subscribers" },
            { p: "spotify", label: "Spotify artist URL", ph: "https://open.spotify.com/artist/...", unit: "followers" },
            { p: "apple_music", label: "Apple Music artist URL", ph: "https://music.apple.com/…/artist/…", unit: "" },
          ] as const).map(({ p, label, ph, unit }) => {
            const runSync = (i?: number) => {
              if (p === "spotify") return syncSpotify(i);
              if (p === "apple_music") return syncApple(i);
              return syncSocial(p, i);
            };
            const mainKey = p === "apple_music" ? "apple" : p;
            const extras = extraLinks[p];
            return (
              <div key={p} className="w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={p}>{label}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => addExtra(p)}
                    disabled={extras.length >= 5}
                    title="Add another handle (e.g. a band member)"
                  >
                    <Plus className="size-3" />
                    <span className="ml-1">Add handle</span>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input id={p} value={form[p]} onChange={(e) => set(p, e.target.value)} placeholder={ph} />
                  <Button type="button" variant="outline" size="sm" onClick={() => runSync()} disabled={syncing !== null}>
                    <RefreshCw className={`size-3 ${syncing === mainKey ? "animate-spin" : ""}`} />
                    <span className="ml-1">Sync</span>
                  </Button>
                </div>
                {fetchedCounts[p] != null && (
                  <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts[p].toLocaleString()} {unit || "followers"}</p>
                )}
                {p === "youtube" && (
                  <Input
                    value={form.youtube_name}
                    onChange={(e) => set("youtube_name", e.target.value)}
                    placeholder="Display name (optional, e.g. State Champs)"
                  />
                )}
                {p === "apple_music" && (
                  <Input
                    value={form.apple_music_name}
                    onChange={(e) => set("apple_music_name", e.target.value)}
                    placeholder="Display name (optional, e.g. State Champs)"
                  />
                )}
                {extras.map((val, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={val}
                        onChange={(e) => setExtra(p, i, e.target.value)}
                        placeholder={`${ph} (extra ${i + 1})`}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => runSync(i)} disabled={syncing !== null}>
                        <RefreshCw className={`size-3 ${syncing === `${p}:${i}` ? "animate-spin" : ""}`} />
                        <span className="ml-1">Sync</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(p, i)} aria-label="Remove handle">
                        <X className="size-3" />
                      </Button>
                    </div>
                    {p === "youtube" && (
                      <Input
                        value={extraNames.youtube[i] ?? ""}
                        onChange={(e) => setExtraName(i, e.target.value)}
                        placeholder={`Display name (optional, extra ${i + 1})`}
                      />
                    )}
                    {fetchedCounts[`${p}:${i}`] != null && (
                      <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts[`${p}:${i}`].toLocaleString()} {unit || "followers"}</p>
                    )}
                  </div>
                ))}
                {p === "spotify" && (
                  <p className="text-xs text-muted-foreground">Fetches followers + monthly listeners (Spotify) and estimated total streams (Kworb).</p>
                )}
                {p === "apple_music" && (
                  <p className="text-xs text-muted-foreground">Verifies the artist name against the spotlight headline.</p>
                )}
              </div>
            );
          })}
          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">More socials</p>
            <p className="text-xs text-muted-foreground">
              Twitch, Facebook, X and one custom link. Hit Sync to fetch follower counts automatically, or type them
              in manually — either way they roll into Total social audience.
            </p>
          </div>
          {([
            { k: "twitch", label: "Twitch URL", ph: "https://twitch.tv/handle" },
            { k: "facebook", label: "Facebook URL", ph: "https://facebook.com/page" },
            { k: "x", label: "X URL", ph: "https://x.com/handle" },
          ] as const).map(({ k, label, ph }) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{label}</Label>
              <div className="flex gap-2">
                <Input id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => syncSocial(k)}
                  disabled={syncing !== null}
                >
                  <RefreshCw className={`size-3 ${syncing === k ? "animate-spin" : ""}`} />
                  <span className="ml-1">Sync</span>
                </Button>
              </div>
              <Input
                inputMode="numeric"
                value={fetchedCounts[k] != null ? String(fetchedCounts[k]) : ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setFetchedCounts((c) => {
                    const next = { ...c };
                    if (!e.target.value.trim() || !Number.isFinite(n)) delete next[k];
                    else next[k] = n;
                    return next;
                  });
                }}
                placeholder="Followers (manual)"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="custom_label">Other link</Label>
            <Input id="custom_label" value={form.custom_label} onChange={(e) => set("custom_label", e.target.value)} placeholder="Label (e.g. Bandcamp)" />
            <Input value={form.custom_url} onChange={(e) => set("custom_url", e.target.value)} placeholder="https://…" />
            <Input
              inputMode="numeric"
              value={fetchedCounts["custom"] != null ? String(fetchedCounts["custom"]) : ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                setFetchedCounts((c) => {
                  const next = { ...c };
                  if (!e.target.value.trim() || !Number.isFinite(n)) delete next["custom"];
                  else next["custom"] = n;
                  return next;
                });
              }}
              placeholder="Followers (manual)"
            />
          </div>
            </div>
          </details>

          {mismatchWarning ? (
            <div className="md:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {mismatchWarning}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="spotifyEmbed">Spotify embed URL</Label>
            <Input id="spotifyEmbed" value={form.spotifyEmbed} onChange={(e) => set("spotifyEmbed", e.target.value)} placeholder="https://open.spotify.com/embed/show/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact (email or URL)</Label>
            <Input id="contact" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
          </div>
          <details className="!order-4 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Featured videos
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (up to four TikTok or Instagram URLs)
              </span>
            </summary>
            <div className="flex w-full flex-col gap-4 px-4">
              <p className="text-xs text-muted-foreground">
                Paste up to four public TikTok or Instagram post/reel URLs. Each shows as a clip card at the bottom of the
                spotlight page. Add a cover image for Instagram clips — Instagram no longer serves public thumbnails,
                so without one the card falls back to a gradient. Uploads land in the{" "}
                <code>video-covers/</code> folder of the public spotlight images bucket, so you can also drop files
                there directly and paste the public URL.
              </p>
              {([1, 2, 3, 4] as const).map((n) => {
                const urlKey = `video${n}` as "video1" | "video2" | "video3" | "video4";
                const coverKey = `video${n}_cover` as "video1_cover" | "video2_cover" | "video3_cover" | "video4_cover";
                return (
                  <div key={n} className="space-y-2 rounded-md border border-border/60 p-3">
                    <Label htmlFor={urlKey}>Video {n}</Label>
                    <Input
                      id={urlKey}
                      value={form[urlKey]}
                      onChange={(e) => set(urlKey, e.target.value)}
                      placeholder="https://www.tiktok.com/@user/video/… or Instagram reel URL"
                    />
                    <FetchPreviewButton url={form[urlKey]} onFetched={(u) => set(coverKey, u)} />
                    <Input
                      id={coverKey}
                      value={form[coverKey]}
                      onChange={(e) => set(coverKey, e.target.value)}
                      placeholder="Cover image URL (optional)"
                    />
                    <ImageUploader
                      label={`Video ${n} cover`}
                      value={form[coverKey]}
                      onChange={(url) => set(coverKey, url)}
                      aspect="9 / 16"
                      hint="9:16 preferred, under 8MB."
                      folder="video-covers"
                    />
                  </div>
                );
              })}
            </div>
          </details>
          <details className="!order-4 md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Featured photos
              <span className="ml-2 text-xs font-normal text-muted-foreground">(optional, up to four 4:5 images)</span>
            </summary>
            <div className="flex w-full flex-col gap-4 px-4">
              <p className="text-xs text-muted-foreground">
                Upload up to four images. They show in a row under the Watch section on the spotlight page. Portrait
                4:5 works best. Uploads land in the public spotlight images bucket.
              </p>
              {([1, 2, 3, 4] as const).map((n) => {
                const key = `photo${n}` as "photo1" | "photo2" | "photo3" | "photo4";
                return (
                  <div key={n} className="space-y-2 rounded-md border border-border/60 p-3">
                    <Label htmlFor={key}>Photo {n}</Label>
                    <Input
                      id={key}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder="Image URL (optional)"
                    />
                    <ImageUploader
                      label={`Photo ${n}`}
                      value={form[key]}
                      onChange={(url) => set(key, url)}
                      aspect="4 / 5"
                      hint="4:5 preferred, under 8MB."
                      folder="spotlights"
                    />
                  </div>
                );
              })}
            </div>
          </details>
          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Key metrics (optional)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-tf">Total social audience</Label>
            <div className="flex gap-2">
              <Input id="sp-tf" inputMode="numeric" value={form.total_followers} onChange={(e) => set("total_followers", e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={applyTotalFollowers} disabled={sumSocialCounts(fetchedCounts) <= 0}>
                Apply sum
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-ts">Total streams</Label>
            <Input id="sp-ts" inputMode="numeric" value={form.total_streams} onChange={(e) => set("total_streams", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-ms">Monthly streams</Label>
            <Input id="sp-ms" inputMode="numeric" value={form.monthly_streams} onChange={(e) => set("monthly_streams", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-ar">Avg. reach</Label>
            <Input id="sp-ar" inputMode="numeric" value={form.avg_reach} onChange={(e) => set("avg_reach", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="sp-ae">Avg. engagement (%)</Label>
            <Input id="sp-ae" inputMode="decimal" value={form.avg_engagement} onChange={(e) => set("avg_engagement", e.target.value)} placeholder="e.g. 4.2" />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch id="published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
            <Label htmlFor="published" className="cursor-pointer">Publish immediately</Label>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : isEditing ? "Update spotlight" : "Create spotlight"}</Button>
            {isEditing && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
    </form>
  );
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "artist", label: "Artist" },
  { value: "brand", label: "Brand" },
  { value: "creative", label: "Creative" },
  { value: "fan", label: "Fan" },
  { value: "crew", label: "Crew" },
] as const;

/**
 * Community profiles: people who exist in the community for admin reference
 * only — no login, no email, hidden from public pages and dashboards.
 */
function CommunityProfileForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    slug: "",
    location: "",
    account_type: "artist" as "" | typeof ACCOUNT_TYPE_OPTIONS[number]["value"],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name.trim()) {
      toast.error("A name is required");
      return;
    }
    setSaving(true);
    try {
      await adminCreateCommunityProfile({
        data: {
          display_name: form.display_name.trim(),
          slug: form.slug.trim() || undefined,
          location: form.location.trim() || undefined,
          account_type: form.account_type || undefined,
        },
      });
      toast.success(`Created ${form.display_name.trim()} — hidden until you make them visible`);
      setForm({ display_name: "", slug: "", location: "", account_type: "artist" });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!confirm("Create hidden community profiles for every creator across all rosters?")) return;
    setImporting(true);
    try {
      const res: any = await adminImportRosterCreators();
      toast.success(`Imported ${res?.created ?? 0} creators (${res?.skipped ?? 0} already existed)`);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Add a community profile</CardTitle>
        <CardDescription>
          Creates a profile with no email and no login. It stays hidden from public pages, dashboards and
          suggested matches until you flip Visible on. Assign an email later from Edit to turn it into a real account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="cp-name">Name</Label>
            <Input id="cp-name" value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="cp-slug">Slug (optional)</Label>
            <Input id="cp-slug" value={form.slug} placeholder="auto from name"
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cp-location">Location (optional)</Label>
            <Input id="cp-location" value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cp-type">Profile type</Label>
            <select
              id="cp-type"
              value={form.account_type}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value as typeof f.account_type }))}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— none —</option>
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create community profile"}</Button>
            <Button type="button" variant="outline" onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : "Import roster creators"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    email_confirm: true,
    account_type: "" as "" | typeof ACCOUNT_TYPE_OPTIONS[number]["value"],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || form.password.length < 8) {
      toast.error("Email and a password of at least 8 characters are required");
      return;
    }
    setSaving(true);
    try {
      await adminCreateUser({
        data: {
          email: form.email.trim(),
          password: form.password,
          display_name: form.display_name.trim() || undefined,
          email_confirm: form.email_confirm,
          account_type: form.account_type || undefined,
        },
      });
      toast.success(`Created ${form.email}`);
      setForm({ email: "", password: "", display_name: "", email_confirm: true, account_type: "" });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Add a new user</CardTitle>
        <CardDescription>Manually provision an account. They can sign in immediately with the password you set.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="nu-email">Email</Label>
            <Input id="nu-email" type="email" autoComplete="off" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="nu-name">Display name (optional)</Label>
            <Input id="nu-name" value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="nu-password">Temporary password</Label>
            <Input id="nu-password" type="text" autoComplete="off" minLength={8} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="nu-type">Account type</Label>
            <select
              id="nu-type"
              value={form.account_type}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value as typeof f.account_type }))}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— none —</option>
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="nu-confirm" checked={form.email_confirm}
              onCheckedChange={(v) => setForm((f) => ({ ...f, email_confirm: v }))} />
            <Label htmlFor="nu-confirm" className="cursor-pointer">Skip email verification</Label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create user"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditUserDialog({
  profile,
  open,
  onOpenChange,
  onSaved,
}: {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: Partial<Profile> & { id: string; email?: string | null }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    display_name: "",
    account_type: "" as string,
    slug: "",
    password: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        email: profile.email ?? "",
        display_name: profile.display_name ?? "",
        account_type: profile.account_type ?? "",
        slug: profile.slug ?? "",
        password: "",
      });
    }
  }, [profile]);

  if (!profile) return null;

  const isManaged = !!profile.managed;

  async function handleAssignEmail() {
    if (!profile) return;
    const email = form.email.trim();
    if (!email) {
      toast.error("Enter an email to assign");
      return;
    }
    if (!confirm(`Create a real account for ${profile.display_name ?? email} using ${email}?`)) return;
    setSaving(true);
    try {
      const res: any = await adminAssignEmail({
        data: { profile_id: profile.id, email, ...(form.password ? { password: form.password } : {}) },
      });
      toast.success(
        res?.temporary_password
          ? `Account created — temporary password: ${res.temporary_password}`
          : "Account created",
      );
      onSaved({ id: profile.id });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign email");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    if (isManaged) {
      setSaving(true);
      try {
        await adminUpdateCommunityProfile({
          data: {
            profile_id: profile.id,
            display_name: form.display_name.trim() || null,
            account_type: (form.account_type || null) as any,
            slug: form.slug.trim() || null,
          },
        });
        onSaved({
          id: profile.id,
          display_name: form.display_name.trim() || null,
          account_type: form.account_type || null,
          slug: form.slug.trim() || null,
        });
        toast.success("Profile updated");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      const patch: any = { user_id: profile.id };
      const trimmedEmail = form.email.trim();
      if (trimmedEmail && trimmedEmail !== (profile.email ?? "")) patch.email = trimmedEmail;
      if (form.display_name.trim() !== (profile.display_name ?? "")) patch.display_name = form.display_name.trim() || null;
      if ((form.account_type || null) !== (profile.account_type ?? null)) patch.account_type = form.account_type || null;
      if ((form.slug.trim() || null) !== (profile.slug ?? null)) patch.slug = form.slug.trim() || null;
      if (form.password) patch.password = form.password;

      if (Object.keys(patch).length === 1) {
        toast.info("Nothing to update");
        setSaving(false);
        return;
      }
      await adminUpdateUser({ data: patch });
      onSaved({
        id: profile.id,
        email: patch.email ?? profile.email,
        display_name: patch.display_name ?? profile.display_name,
        account_type: patch.account_type ?? profile.account_type,
        slug: patch.slug ?? profile.slug,
      });
      toast.success("User updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isManaged ? "Edit community profile" : "Edit user"}</DialogTitle>
          <DialogDescription>
            {isManaged
              ? "This profile has no login yet. Add an email and assign it to turn it into a real account."
              : "Update profile details for this account."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="eu-email">Email</Label>
            <Input id="eu-email" type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            {isManaged ? (
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleAssignEmail} disabled={saving}>
                Assign email &amp; create account
              </Button>
            ) : null}
          </div>
          <div>
            <Label htmlFor="eu-name">Display name</Label>
            <Input id="eu-name" value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="eu-type">Account type</Label>
            <select
              id="eu-type"
              value={form.account_type}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— none —</option>
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="eu-slug">Public slug</Label>
            <Input id="eu-slug" value={form.slug} placeholder="e.g. jane-doe"
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="eu-password">{isManaged ? "Password for new account (optional)" : "New password (optional)"}</Label>
            <Input id="eu-password" type="text" autoComplete="off" minLength={8} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={isManaged ? "Leave blank to auto-generate" : "Leave blank to keep existing"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BRIEF_COLLABORATION_TYPES = [
  "Social Media Campaign",
  "Live Performance",
  "Content Creation",
  "Brand Ambassadorship",
  "Merchandise Collaboration",
  "Sponsored Song/Video",
];

const BRIEF_CORE_VALUES = [
  "Authenticity",
  "Creativity",
  "Community",
  "Sustainability",
  "Innovation",
  "Inclusivity",
];

function NewCampaignBriefForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    contact_email: "",
    budget: "",
    timeline: "",
    target_audience: "",
    status: "in_review",
  });

  function toggle(list: string[], setList: (v: string[]) => void, item: string, max?: number) {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      if (max && list.length >= max) {
        toast.error(`You can pick up to ${max}`);
        return;
      }
      setList([...list, item]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 2 || form.description.trim().length < 10) {
      toast.error("Add a title and a description (10+ chars)");
      return;
    }
    if (findProfanityIn(form)) {
      toast.error("Please remove offensive or inappropriate language from the brief before saving.");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("campaign_briefs").insert({
        user_id: u.user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        contact_email: form.contact_email.trim() || null,
        budget: form.budget ? Number(form.budget) : null,
        timeline: form.timeline.trim() || null,
        target_audience: form.target_audience.trim() || null,
        collaboration_types: types,
        core_values: values,
        status: form.status || "in_review",
      });
      if (error) throw error;
      toast.success("Campaign brief added");
      setForm({ title: "", description: "", contact_email: "", budget: "", timeline: "", target_audience: "", status: "in_review" });
      setValues([]);
      setTypes([]);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add brief");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Add a campaign brief</CardTitle>
        <CardDescription>Manually create a brief using the same fields as the public submission form.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="cb-title">Campaign title *</Label>
            <Input id="cb-title" value={form.title} maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="cb-desc">Project description *</Label>
            <Textarea id="cb-desc" rows={5} value={form.description} maxLength={5000}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="cb-email">Contact email</Label>
            <Input id="cb-email" type="email" value={form.contact_email} maxLength={320}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cb-budget">Estimated budget ($)</Label>
            <Input id="cb-budget" type="number" min={0} value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cb-timeline">Timeline</Label>
            <Input id="cb-timeline" value={form.timeline} maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cb-status">Status</Label>
            <Input id="cb-status" value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="cb-audience">Target audience</Label>
            <Textarea id="cb-audience" rows={2} value={form.target_audience} maxLength={2000}
              onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Core values (pick up to 3)</Label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {BRIEF_CORE_VALUES.map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                  <input type="checkbox" checked={values.includes(v)}
                    onChange={() => toggle(values, setValues, v, 3)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Collaboration types</Label>
            <div className="grid grid-cols-2 gap-2">
              {BRIEF_COLLABORATION_TYPES.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                  <input type="checkbox" checked={types.includes(t)}
                    onChange={() => toggle(types, setTypes, t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add brief"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}



function FeaturedSpotlightsToggle() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDashboardConfig().then((cfg) => {
      setEnabled(cfg.featuredSpotlightsEnabled);
      setLoaded(true);
    });
  }, []);

  async function update(next: boolean) {
    setEnabled(next);
    try {
      await saveDashboardConfig({ featuredSpotlightsEnabled: next });
      toast.success(next ? "Featured spotlights shown on dashboards" : "Featured spotlights hidden on dashboards");
    } catch (e: any) {
      setEnabled(!next);
      toast.error(e?.message ?? "Could not save");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Featured spotlights on dashboards</CardTitle>
          <CardDescription>
            Turn off to hide the whole Featured spotlights carousel for every user — this overrides any
            spotlights or briefs shared to dashboards.
          </CardDescription>
        </div>
        <Switch checked={enabled} disabled={!loaded} onCheckedChange={update} />
      </CardHeader>
    </Card>
  );
}
