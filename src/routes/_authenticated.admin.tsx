import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scrapeProfileFollowers, scrapeSpotifyArtist } from "@/lib/campaign-scrapers.functions";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";
import { adminCreateUser, adminDeleteUser } from "@/lib/admin-users.functions";
import { ACCESS_CODE } from "@/routes/login";
import { VibeCheckAdmin } from "@/components/admin/VibeCheckAdmin";
import { BriefFormAdmin } from "@/components/admin/BriefFormAdmin";
import { CommunityAdmin } from "@/components/admin/CommunityAdmin";
import { EmailsAdmin } from "@/components/admin/EmailsAdmin";
import { TrafficAdmin } from "@/components/admin/TrafficAdmin";
import { BriefStatusBadge, BriefStatusSelect, type BriefStatus } from "@/components/briefs/BriefStatusBadge";
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
};
type ContactMsg = { id: string; created_at: string; name: string; email: string; message: string; handled: boolean };
type Subscriber = { id: string; created_at: string; email: string; name: string | null; source: string; marketing_opt_in: boolean };
type Profile = { id: string; email: string | null; display_name: string | null; account_type: string | null; created_at: string; slug: string | null; avatar_url: string | null; is_featured?: boolean | null };
type CampaignBrief = { id: string; created_at: string; title: string; description: string; user_id: string; budget: number | null; status: string; contact_email: string | null; published: boolean; published_at: string | null };

type Spotlight = {
  id: string; slug: string; type: string; headline: string; subtitle: string | null;
  published: boolean; created_at: string; links?: Record<string, string> | null;
};

type SpotlightInterest = {
  id: string; created_at: string; partner_page_id: string; user_id: string;
  profile?: { display_name: string | null; email: string | null } | null;
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leadBriefs, setLeadBriefs] = useState<LeadBrief[]>([]);
  const [contacts, setContacts] = useState<ContactMsg[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [editingSpotlight, setEditingSpotlight] = useState<Record<string, any> | null>(null);
  const [spotlightFormOpen, setSpotlightFormOpen] = useState(false);
  const [interests, setInterests] = useState<SpotlightInterest[]>([]);
  const [expandedInterests, setExpandedInterests] = useState<Set<string>>(new Set());

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

      const [lb, cm, ml, pr, cb, sp, si] = await Promise.all([
        supabase.from("lead_briefs").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
        supabase.from("mailing_list_subscribers").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email, display_name, account_type, created_at, slug, avatar_url, is_featured").order("created_at", { ascending: false }),
        supabase.from("campaign_briefs").select("id, created_at, title, description, user_id, budget, status, contact_email, published, published_at").order("created_at", { ascending: false }),
        supabase.from("partner_pages" as any).select("*").order("created_at", { ascending: false }),
        supabase.from("spotlight_interests" as any).select("id, created_at, partner_page_id, user_id").order("created_at", { ascending: false }),
      ]);
      setLeadBriefs((lb.data as LeadBrief[]) ?? []);
      setContacts((cm.data as ContactMsg[]) ?? []);
      setSubs((ml.data as Subscriber[]) ?? []);
      setProfiles((pr.data as Profile[]) ?? []);
      setCampaigns((cb.data as CampaignBrief[]) ?? []);
      setSpotlights((sp.data as unknown as Spotlight[]) ?? []);

      // Hydrate interests with profile info (display name + email)
      const rawInterests = (si.data as unknown as SpotlightInterest[]) ?? [];
      const userIds = Array.from(new Set(rawInterests.map((i) => i.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]));
        setInterests(rawInterests.map((i) => ({ ...i, profile: map.get(i.user_id) ?? null })));
      } else {
        setInterests(rawInterests);
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function refreshSpotlights() {
    const { data } = await supabase
      .from("partner_pages" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setSpotlights((data as unknown as Spotlight[]) ?? []);
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
          <Button asChild variant="outline">
            <Link to="/roster-builder">Roster Builder →</Link>
          </Button>
        </div>

        <Tabs defaultValue="traffic">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="contact">Contact ({contacts.length})</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="users">Users ({profiles.length})</TabsTrigger>
            <TabsTrigger value="mailing">Mailing list ({subs.length})</TabsTrigger>
            
            <TabsTrigger value="brief-form">Brief Form</TabsTrigger>
            <TabsTrigger value="spotlights">Spotlights ({spotlights.length})</TabsTrigger>
            <TabsTrigger value="vibe">Vibe Check</TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="mt-6">
            <TrafficAdmin />
          </TabsContent>





          <TabsContent value="spotlights" className="mt-6 space-y-6">
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

            {spotlights.length === 0 ? <Empty /> : (
              <div className="space-y-3">
                {spotlights.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{s.headline}</CardTitle>
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
                          <Badge variant={s.published ? "default" : "outline"}>
                            {s.published ? "Published" : "Draft"}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/spotlight/${s.slug}`} target="_blank" rel="noreferrer">
                              View <ExternalLink className="ml-1 size-3" />
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
                    {(() => {
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
                                    {r.profile?.display_name ?? "Unnamed user"}
                                    {r.profile?.email ? <span className="text-muted-foreground"> · {r.profile.email}</span> : null}
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
                ))}
              </div>
            )}
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
            <NewUserForm
              onCreated={async () => {
                const { data } = await supabase
                  .from("profiles")
                  .select("id, email, display_name, account_type, created_at, slug, avatar_url, is_featured")
                  .order("created_at", { ascending: false });
                setProfiles((data as Profile[]) ?? []);
              }}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Featured in Suggested matches</CardTitle>
                <CardDescription>
                  Toggle a user to surface their public profile on every dashboard's "Suggested matches" card.
                  Users without a public slug won't appear publicly — set one on their profile first.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table headers={["Display name", "Email", "Profile type", "Slug", "Joined", "Featured", ""]}>
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
                      <td className="p-3 text-muted-foreground">
                        {p.slug ? <code className="text-xs">/u/{p.slug}</code> : <span className="text-xs italic">no slug</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Permanently delete user ${p.email ?? p.display_name ?? p.id}? This cannot be undone.`)) return;
                            try {
                              await adminDeleteUser({ data: { user_id: p.id } });
                              setProfiles((rows) => rows.filter((r) => r.id !== p.id));
                              toast.success("User removed");
                            } catch (e: any) {
                              toast.error(e?.message ?? "Failed to remove user");
                            }
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


          <TabsContent value="contact" className="mt-6 space-y-3">
            {contacts.length === 0 ? <Empty /> : contacts.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{m.name}</CardTitle>
                      <CardDescription>{m.email}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Meta date={m.created_at} status={m.handled ? "handled" : "new"} />
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
            ))}
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

function ImageUploader({
  label, value, onChange, aspect, hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect: string;
  hint: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("spotlight-images").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("spotlight-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success(`${label} uploaded`);
    e.target.value = "";
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

function SpotlightForm({
  onCreated,
  editData,
  onCancel,
}: {
  onCreated: () => void;
  editData?: Record<string, any> | null;
  onCancel?: () => void;
}) {
  const isEditing = !!editData;
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
    audience_segments: (editData?.audience_segments ?? []).join("\n"),
    instagram: editData?.links?.instagram ?? "",
    tiktok: editData?.links?.tiktok ?? "",
    youtube: editData?.links?.youtube ?? "",
    spotify: editData?.links?.spotify ?? "",
    spotifyEmbed: editData?.links?.spotifyEmbed ?? "",
    contact: editData?.links?.contact ?? "",
    video1: editData?.links?.video1 ?? "",
    video2: editData?.links?.video2 ?? "",
    video3: editData?.links?.video3 ?? "",
    header_image_url: editData?.header_image_url ?? "",
    profile_image_url: editData?.profile_image_url ?? "",
    published: editData?.published ?? false,
    total_followers: editData?.total_followers?.toString() ?? "",
    total_streams: editData?.total_streams?.toString() ?? "",
    monthly_streams: editData?.monthly_streams?.toString() ?? "",
    avg_reach: editData?.avg_reach?.toString() ?? "",
    avg_engagement: editData?.avg_engagement?.toString() ?? "",
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

  const scrapeProfile = useServerFn(scrapeProfileFollowers);
  const scrapeSpotify = useServerFn(scrapeSpotifyArtist);
  const [syncing, setSyncing] = useState<null | "instagram" | "tiktok" | "youtube" | "spotify">(null);
  const [fetchedCounts, setFetchedCounts] = useState<{ instagram?: number; tiktok?: number; youtube?: number; spotify?: number }>({});

  async function syncSocial(platform: "instagram" | "tiktok" | "youtube") {
    const raw = String(form[platform] || "").trim();
    if (!raw) {
      toast.error(`Enter a ${platform} URL first`);
      return;
    }
    let full = raw;
    if (!/^https?:\/\//i.test(full)) {
      const h = full.replace(/^@/, "");
      if (platform === "instagram") full = `https://instagram.com/${h}`;
      else if (platform === "tiktok") full = `https://tiktok.com/@${h}`;
      else full = `https://youtube.com/@${h}`;
    }
    setSyncing(platform);
    try {
      const r = await scrapeProfile({ data: { url: full } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.followers != null) {
        setFetchedCounts((c) => ({ ...c, [platform]: r.followers ?? 0 }));
        toast.success(`${platform}: ${r.followers.toLocaleString()} followers`);
      } else {
        toast.error("No follower count returned");
      }
    } finally {
      setSyncing(null);
    }
  }

  async function syncSpotify() {
    const raw = String(form.spotify || "").trim();
    if (!raw) {
      toast.error("Enter a Spotify artist URL first");
      return;
    }
    setSyncing("spotify");
    try {
      const r = await scrapeSpotify({ data: { url: raw } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const updates: string[] = [];
      if (r.followers != null) {
        setFetchedCounts((c) => ({ ...c, spotify: r.followers ?? 0 }));
        set("total_followers", String(r.followers));
        updates.push(`${r.followers.toLocaleString()} followers`);
      }
      if (r.monthly_listeners != null) {
        set("monthly_streams", String(r.monthly_listeners));
        updates.push(`${r.monthly_listeners.toLocaleString()} monthly listeners`);
      }
      if (r.total_streams != null) {
        set("total_streams", String(r.total_streams));
        updates.push(`${r.total_streams.toLocaleString()} total streams`);
      }
      if (updates.length === 0) toast.error("No Spotify metrics returned");
      else toast.success(`Spotify: ${updates.join(" · ")}`);
    } finally {
      setSyncing(null);
    }
  }

  function applyTotalFollowers() {
    const total =
      (fetchedCounts.instagram ?? 0) +
      (fetchedCounts.tiktok ?? 0) +
      (fetchedCounts.youtube ?? 0);
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
      type: form.type || "podcast",
      headline: form.headline,
      subtitle: form.subtitle || null,
      intro: form.intro || null,
      host_bio: form.host_bio || null,
      partnership_pitch: form.partnership_pitch || null,
      eoi_opportunities: form.eoi_opportunities
        .split("\n").map((s: string) => s.trim()).filter(Boolean),
      audience_segments: form.audience_segments
        .split("\n").map((s: string) => s.trim()).filter(Boolean),
      links: {
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        spotify: form.spotify,
        spotifyEmbed: form.spotifyEmbed,
        contact: form.contact,
        video1: form.video1,
        video2: form.video2,
        video3: form.video3,
      },
      header_image_url: form.header_image_url || null,
      profile_image_url: form.profile_image_url || null,
      published: form.published,
      total_followers: numOrNull(form.total_followers),
      total_streams: numOrNull(form.total_streams),
      monthly_streams: numOrNull(form.monthly_streams),
      avg_reach: numOrNull(form.avg_reach),
      avg_engagement: numOrNull(form.avg_engagement),
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
        host_bio: "", partnership_pitch: "", eoi_opportunities: "", audience_segments: "",
        instagram: "", tiktok: "", youtube: "", spotify: "", spotifyEmbed: "", contact: "",
        video1: "", video2: "", video3: "",
        header_image_url: "", profile_image_url: "", published: false,
        total_followers: "", total_streams: "", monthly_streams: "",
        avg_reach: "", avg_engagement: "",
      });
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ymyb-spotlight" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="podcast" />
          </div>
          <div className="md:col-span-2">
            <ImageUploader
              label="Header image"
              value={form.header_image_url}
              onChange={(url) => set("header_image_url", url)}
              aspect="16 / 9"
              hint="16:9 banner shown at the top of the spotlight page. JPG/PNG, up to 8MB."
            />
          </div>
          <div className="md:col-span-2">
            <ImageUploader
              label="Profile photo / artwork"
              value={form.profile_image_url}
              onChange={(url) => set("profile_image_url", url)}
              aspect="1 / 1"
              hint="Square headshot or cover artwork. JPG/PNG, up to 8MB."
            />
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
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience segments (one per line)</Label>
            <Textarea id="audience" rows={4} value={form.audience_segments} onChange={(e) => set("audience_segments", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram URL</Label>
            <div className="flex gap-2">
              <Input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/handle" />
              <Button type="button" variant="outline" size="sm" onClick={() => syncSocial("instagram")} disabled={syncing !== null}>
                <RefreshCw className={`size-3 ${syncing === "instagram" ? "animate-spin" : ""}`} />
                <span className="ml-1">Sync</span>
              </Button>
            </div>
            {fetchedCounts.instagram != null && (
              <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.instagram.toLocaleString()} followers</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tiktok">TikTok URL</Label>
            <div className="flex gap-2">
              <Input id="tiktok" value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="https://tiktok.com/@handle" />
              <Button type="button" variant="outline" size="sm" onClick={() => syncSocial("tiktok")} disabled={syncing !== null}>
                <RefreshCw className={`size-3 ${syncing === "tiktok" ? "animate-spin" : ""}`} />
                <span className="ml-1">Sync</span>
              </Button>
            </div>
            {fetchedCounts.tiktok != null && (
              <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.tiktok.toLocaleString()} followers</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="youtube">YouTube URL</Label>
            <div className="flex gap-2">
              <Input id="youtube" value={form.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/@handle" />
              <Button type="button" variant="outline" size="sm" onClick={() => syncSocial("youtube")} disabled={syncing !== null}>
                <RefreshCw className={`size-3 ${syncing === "youtube" ? "animate-spin" : ""}`} />
                <span className="ml-1">Sync</span>
              </Button>
            </div>
            {fetchedCounts.youtube != null && (
              <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.youtube.toLocaleString()} subscribers</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spotify">Spotify artist URL</Label>
            <div className="flex gap-2">
              <Input id="spotify" value={form.spotify} onChange={(e) => set("spotify", e.target.value)} placeholder="https://open.spotify.com/artist/..." />
              <Button type="button" variant="outline" size="sm" onClick={syncSpotify} disabled={syncing !== null}>
                <RefreshCw className={`size-3 ${syncing === "spotify" ? "animate-spin" : ""}`} />
                <span className="ml-1">Sync</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Fetches followers + monthly listeners (Spotify) and estimated total streams (Kworb).</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spotifyEmbed">Spotify embed URL</Label>
            <Input id="spotifyEmbed" value={form.spotifyEmbed} onChange={(e) => set("spotifyEmbed", e.target.value)} placeholder="https://open.spotify.com/embed/show/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact (email or URL)</Label>
            <Input id="contact" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Featured videos (TikTok or Instagram URLs)</Label>
            <p className="text-xs text-muted-foreground">Paste up to three public TikTok or Instagram post/reel URLs. They'll embed at the bottom of the spotlight page.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video1">Video 1</Label>
            <Input id="video1" value={form.video1} onChange={(e) => set("video1", e.target.value)} placeholder="https://www.tiktok.com/@user/video/123…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video2">Video 2</Label>
            <Input id="video2" value={form.video2} onChange={(e) => set("video2", e.target.value)} placeholder="https://www.instagram.com/reel/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video3">Video 3</Label>
            <Input id="video3" value={form.video3} onChange={(e) => set("video3", e.target.value)} placeholder="https://www.tiktok.com/@user/video/…" />
          </div>
          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Key metrics (optional)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-tf">Total followers</Label>
            <div className="flex gap-2">
              <Input id="sp-tf" inputMode="numeric" value={form.total_followers} onChange={(e) => set("total_followers", e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={applyTotalFollowers} disabled={!fetchedCounts.instagram && !fetchedCounts.tiktok && !fetchedCounts.youtube}>
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

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    email_confirm: true,
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
        },
      });
      toast.success(`Created ${form.email}`);
      setForm({ email: "", password: "", display_name: "", email_confirm: true });
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


