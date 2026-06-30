import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Plus,
  Trash2,
  Users,
  Share2,
  ArrowLeft,
  ExternalLink,
  UserPlus,
  Search,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { normalizeSlug } from "@/lib/slugs";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/roster-builder")({
  head: () => ({
    meta: [
      { title: "Roster Builder — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RosterBuilderPage,
});

type Roster = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  brief_id: string | null;
  slug: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type Brief = {
  id: string;
  title: string;
  description: string;
  contact_email: string | null;
  budget: number | null;
  status: string;
  created_at: string;
};

type RosterItem = {
  id: string;
  roster_id: string;
  kind: "profile" | "prospect";
  profile_id: string | null;
  name: string;
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
};

type Share = {
  id: string;
  roster_id: string;
  user_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommunityRow = {
  id: string;
  display_name: string;
  account_type: string;
  tagline: string | null;
  avatar_url: string | null;
};

function RosterBuilderPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<RosterItem[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [community, setCommunity] = useState<CommunityRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);

  // bootstrap: verify admin + load rosters
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(u.user.id);
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);
      await loadRosters();
      const [{ data: cm }, { data: pr }, { data: cb }] = await Promise.all([
        supabase
          .from("community_profiles")
          .select("id, display_name, account_type, tagline, avatar_url")
          .order("display_name"),
        supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .order("display_name"),
        supabase
          .from("campaign_briefs")
          .select("id, title, description, contact_email, budget, status, created_at")
          .order("created_at", { ascending: false }),
      ]);
      setCommunity((cm as CommunityRow[]) ?? []);
      setProfiles((pr as ProfileRow[]) ?? []);
      setBriefs((cb as Brief[]) ?? []);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRosters = useCallback(async () => {
    const { data, error } = await supabase
      .from("rosters")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRosters((data as Roster[]) ?? []);
  }, []);

  const loadDetail = useCallback(async (rosterId: string) => {
    const [{ data: it }, { data: sh }] = await Promise.all([
      supabase
        .from("roster_items")
        .select("*")
        .eq("roster_id", rosterId)
        .order("position", { ascending: true }),
      supabase.from("roster_shares").select("*").eq("roster_id", rosterId),
    ]);
    setItems((it as RosterItem[]) ?? []);
    setShares((sh as Share[]) ?? []);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else {
      setItems([]);
      setShares([]);
    }
  }, [selectedId, loadDetail]);

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
              <CardDescription>
                Roster Builder is currently admin-only. Ask an admin to share a roster with you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const selected = rosters.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Roster Builder</h1>
            <p className="mt-2 text-muted-foreground">
              Plan bespoke campaign rosters — mix community profiles with prospective creators, then share with select users.
            </p>
          </div>
          {selected && (
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="mr-2 size-4" /> All rosters
            </Button>
          )}
        </div>

        {!selected ? (
          <RosterListView
            rosters={rosters}
            briefs={briefs}
            userId={userId}
            onCreated={async (id) => {
              await loadRosters();
              setSelectedId(id);
            }}
            onSelect={setSelectedId}
            onDeleted={async () => {
              await loadRosters();
            }}
          />
        ) : (
          <RosterDetailView
            roster={selected}
            items={items}
            shares={shares}
            community={community}
            profiles={profiles}
            briefs={briefs}
            onChanged={async () => {
              await Promise.all([loadDetail(selected.id), loadRosters()]);
            }}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/* --------------------------------- List --------------------------------- */

function RosterListView({
  rosters,
  briefs,
  userId,
  onCreated,
  onSelect,
  onDeleted,
}: {
  rosters: Roster[];
  briefs: Brief[];
  userId: string | null;
  onCreated: (id: string) => void;
  onSelect: (id: string) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [briefId, setBriefId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const briefById = useMemo(() => new Map(briefs.map((b) => [b.id, b])), [briefs]);

  function pickBrief(id: string) {
    setBriefId(id);
    if (id === "" || id === "none") return;
    const b = briefById.get(id);
    if (!b) return;
    // Prefill if fields are empty
    if (!title.trim()) setTitle(`Roster — ${b.title}`);
    if (!description.trim()) setDescription(b.description);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("rosters")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        owner_id: userId,
        brief_id: briefId && briefId !== "none" ? briefId : null,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setDescription("");
    setBriefId("");
    toast.success("Roster created");
    onCreated((data as { id: string }).id);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this roster? All items and shares will be removed.")) return;
    const { error } = await supabase.from("rosters").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onDeleted();
  }

  // Briefs that don't yet have a roster
  const rosterBriefIds = new Set(rosters.map((r) => r.brief_id).filter(Boolean) as string[]);
  const unusedBriefs = briefs.filter((b) => !rosterBriefIds.has(b.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Rosters</CardTitle>
          <CardDescription>Each roster plans one campaign brief.</CardDescription>
        </CardHeader>
        <CardContent>
          {rosters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rosters yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {rosters.map((r) => {
                const linked = r.brief_id ? briefById.get(r.brief_id) : null;
                return (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(r.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.title}</span>
                        {linked ? (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            Brief · {linked.title}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                            No brief
                          </Badge>
                        )}
                      </div>
                      {r.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(r.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">New roster</CardTitle>
          <CardDescription>
            Start from a submitted brief, or create a blank roster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="brief-pick">Link to brief</Label>
              <Select value={briefId || "none"} onValueChange={pickBrief}>
                <SelectTrigger id="brief-pick">
                  <SelectValue placeholder="No brief — start blank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No brief — start blank</SelectItem>
                  {unusedBriefs.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No unlinked briefs available.
                    </div>
                  ) : (
                    unusedBriefs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                        {b.contact_email ? ` — ${b.contact_email}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting a brief prefills the title and description.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roster-title">Title</Label>
              <Input
                id="roster-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer launch — wave 1"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roster-desc">Description</Label>
              <Textarea
                id="roster-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this roster for?"
                rows={3}
                maxLength={2000}
              />
            </div>
            <Button type="submit" disabled={creating || !title.trim()} className="w-full">
              <Plus className="mr-2 size-4" /> Create roster
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------- Detail -------------------------------- */

function RosterDetailView({
  roster,
  items,
  shares,
  community,
  profiles,
  briefs,
  onChanged,
}: {
  roster: Roster;
  items: RosterItem[];
  shares: Share[];
  community: CommunityRow[];
  profiles: ProfileRow[];
  briefs: Brief[];
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(roster.title);
  const [description, setDescription] = useState(roster.description ?? "");
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    setTitle(roster.title);
    setDescription(roster.description ?? "");
  }, [roster.id, roster.title, roster.description]);

  const linkedBrief = roster.brief_id ? briefs.find((b) => b.id === roster.brief_id) ?? null : null;

  async function saveMeta() {
    setSavingMeta(true);
    const { error } = await supabase
      .from("rosters")
      .update({ title: title.trim(), description: description.trim() || null })
      .eq("id", roster.id);
    setSavingMeta(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onChanged();
  }

  async function setLinkedBrief(briefId: string | null) {
    const { error } = await supabase
      .from("rosters")
      .update({ brief_id: briefId })
      .eq("id", roster.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(briefId ? "Brief linked" : "Brief unlinked");
    onChanged();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("roster_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged();
  }

  // Briefs available to link: this roster's current brief + any brief not linked to another roster.
  // We don't have access to the rosters list here, so allow any brief; admins can re-link as needed.
  const linkableBriefs = briefs;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Linked brief */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Linked brief</CardTitle>
            <CardDescription>
              The submitted campaign brief this roster is built for.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedBrief ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{linkedBrief.title}</div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {linkedBrief.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {linkedBrief.contact_email && <span>{linkedBrief.contact_email}</span>}
                      {linkedBrief.budget != null && <span>£{linkedBrief.budget}</span>}
                      <span>Status: {linkedBrief.status}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setLinkedBrief(null)}>
                    Unlink
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Link a submitted brief</Label>
                <Select
                  value="none"
                  onValueChange={(v) => setLinkedBrief(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brief…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brief</SelectItem>
                    {linkableBriefs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                        {b.contact_email ? ` — ${b.contact_email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roster meta */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Roster details</CardTitle>
            <CardDescription>Internal title + notes for this roster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveMeta} disabled={savingMeta || !title.trim()}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Roster items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl">
                  Roster ({items.length})
                </CardTitle>
                <CardDescription>Creators and prospective partners in this campaign.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Roster is empty. Add a community profile or a prospective creator from the right.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((it) => (
                  <RosterItemRow key={it.id} item={it} onRemove={() => removeItem(it.id)} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column: add + share */}
      <div className="space-y-6">
        <AddCommunityCard
          community={community}
          existingProfileIds={new Set(items.filter((i) => i.profile_id).map((i) => i.profile_id!))}
          rosterId={roster.id}
          nextPosition={items.length}
          onAdded={onChanged}
        />
        <AddProspectCard rosterId={roster.id} nextPosition={items.length} onAdded={onChanged} />
        <PublishPanel roster={roster} onChanged={onChanged} />
        <SharePanel
          rosterId={roster.id}
          shares={shares}
          profiles={profiles}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

function RosterItemRow({ item, onRemove }: { item: RosterItem; onRemove: () => void }) {
  const stats: Array<[string, number | null, string | null]> = [
    ["IG", item.instagram_followers, item.instagram_url],
    ["TT", item.tiktok_followers, item.tiktok_url],
    ["YT", item.youtube_subscribers, item.youtube_url],
    ["Spotify", item.spotify_monthly_listens, item.spotify_url],
  ];
  return (
    <li className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {item.kind === "profile" ? "Profile" : "Prospect"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
          {(item.example_video_url || item.bio_page_url) && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {item.example_video_url && (
                <a
                  href={item.example_video_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:underline"
                >
                  Example video
                </a>
              )}
              {item.bio_page_url && (
                <a
                  href={item.bio_page_url}
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
        <Button size="icon" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ----------------------------- Add community ---------------------------- */

function AddCommunityCard({
  community,
  existingProfileIds,
  rosterId,
  nextPosition,
  onAdded,
}: {
  community: CommunityRow[];
  existingProfileIds: Set<string>;
  rosterId: string;
  nextPosition: number;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = community.filter((c) => !existingProfileIds.has(c.id));
    if (!q) return list.slice(0, 8);
    return list
      .filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          (c.tagline ?? "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [community, existingProfileIds, query]);

  async function add(c: CommunityRow) {
    const { error } = await supabase.from("roster_items").insert({
      roster_id: rosterId,
      kind: "profile",
      profile_id: c.id,
      name: c.display_name,
      position: nextPosition,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Added ${c.display_name}`);
    onAdded();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Users className="size-4" /> Add from community
        </CardTitle>
        <CardDescription>Pull in existing community profiles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search community…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.display_name}</div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.account_type}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => add(c)}>
                  <Plus className="mr-1 size-3" /> Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Add prospect ---------------------------- */

function AddProspectCard({
  rosterId,
  nextPosition,
  onAdded,
}: {
  rosterId: string;
  nextPosition: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instagram_url: "",
    instagram_followers: "",
    tiktok_url: "",
    tiktok_followers: "",
    youtube_url: "",
    youtube_subscribers: "",
    spotify_url: "",
    spotify_monthly_listens: "",
    example_video_url: "",
    has_bio: false,
    bio_page_url: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function toNum(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("roster_items").insert({
      roster_id: rosterId,
      kind: "prospect",
      profile_id: null,
      name: form.name.trim(),
      instagram_url: form.instagram_url.trim() || null,
      instagram_followers: toNum(form.instagram_followers),
      tiktok_url: form.tiktok_url.trim() || null,
      tiktok_followers: toNum(form.tiktok_followers),
      youtube_url: form.youtube_url.trim() || null,
      youtube_subscribers: toNum(form.youtube_subscribers),
      spotify_url: form.spotify_url.trim() || null,
      spotify_monthly_listens: toNum(form.spotify_monthly_listens),
      example_video_url: form.example_video_url.trim() || null,
      bio_page_url: form.has_bio ? form.bio_page_url.trim() || null : null,
      position: nextPosition,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Creator added");
    setForm({
      name: "",
      instagram_url: "",
      instagram_followers: "",
      tiktok_url: "",
      tiktok_followers: "",
      youtube_url: "",
      youtube_subscribers: "",
      spotify_url: "",
      spotify_monthly_listens: "",
      example_video_url: "",
      has_bio: false,
      bio_page_url: "",
    });
    setOpen(false);
    onAdded();
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <UserPlus className="size-4" /> Add new creator
            </CardTitle>
            <CardDescription>Manually enter a prospective creator.</CardDescription>
          </div>
          <Plus className={`size-4 transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <Field label="Creator name">
              <Input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Alex Creative"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Instagram URL">
                <Input
                  value={form.instagram_url}
                  onChange={(e) => update("instagram_url", e.target.value)}
                  placeholder="https://instagram.com/…"
                />
              </Field>
              <Field label="IG followers">
                <Input
                  inputMode="numeric"
                  value={form.instagram_followers}
                  onChange={(e) => update("instagram_followers", e.target.value)}
                  placeholder="143000"
                />
              </Field>
              <Field label="TikTok URL">
                <Input
                  value={form.tiktok_url}
                  onChange={(e) => update("tiktok_url", e.target.value)}
                  placeholder="https://tiktok.com/@…"
                />
              </Field>
              <Field label="TT followers">
                <Input
                  inputMode="numeric"
                  value={form.tiktok_followers}
                  onChange={(e) => update("tiktok_followers", e.target.value)}
                  placeholder="50000"
                />
              </Field>
              <Field label="YouTube URL">
                <Input
                  value={form.youtube_url}
                  onChange={(e) => update("youtube_url", e.target.value)}
                  placeholder="https://youtube.com/…"
                />
              </Field>
              <Field label="YT subscribers">
                <Input
                  inputMode="numeric"
                  value={form.youtube_subscribers}
                  onChange={(e) => update("youtube_subscribers", e.target.value)}
                  placeholder="25000"
                />
              </Field>
              <Field label="Spotify URL">
                <Input
                  value={form.spotify_url}
                  onChange={(e) => update("spotify_url", e.target.value)}
                  placeholder="https://open.spotify.com/…"
                />
              </Field>
              <Field label="Monthly listens">
                <Input
                  inputMode="numeric"
                  value={form.spotify_monthly_listens}
                  onChange={(e) => update("spotify_monthly_listens", e.target.value)}
                  placeholder="1000000"
                />
              </Field>
            </div>
            <Field label="Example video link (9:16)">
              <Input
                value={form.example_video_url}
                onChange={(e) => update("example_video_url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-bio"
                checked={form.has_bio}
                onCheckedChange={(c) => update("has_bio", Boolean(c))}
              />
              <Label htmlFor="has-bio" className="text-sm font-normal">
                Has a dedicated Bio Page
              </Label>
            </div>
            {form.has_bio && (
              <Field label="Bio page URL">
                <Input
                  value={form.bio_page_url}
                  onChange={(e) => update("bio_page_url", e.target.value)}
                  placeholder="/creators/name"
                />
              </Field>
            )}
            <Button type="submit" disabled={submitting || !form.name.trim()} className="w-full">
              Add creator to roster
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* --------------------------------- Share -------------------------------- */

function SharePanel({
  rosterId,
  shares,
  profiles,
  onChanged,
}: {
  rosterId: string;
  shares: Share[];
  profiles: ProfileRow[];
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const sharedIds = useMemo(() => new Set(shares.map((s) => s.user_id)), [shares]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return profiles
      .filter((p) => !sharedIds.has(p.id))
      .filter(
        (p) =>
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.display_name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [profiles, sharedIds, query]);

  async function share(p: ProfileRow) {
    const { error } = await supabase
      .from("roster_shares")
      .insert({ roster_id: rosterId, user_id: p.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Shared with ${p.display_name ?? p.email}`);
    setQuery("");
    onChanged();
  }

  async function unshare(s: Share) {
    const { error } = await supabase.from("roster_shares").delete().eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged();
  }

  const sharedProfiles = shares
    .map((s) => ({ share: s, profile: profiles.find((p) => p.id === s.user_id) ?? null }))
    .filter((x) => x.profile);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Share2 className="size-4" /> Share roster
        </CardTitle>
        <CardDescription>
          Only people you add here can view this roster. They'll see it at <code>/roster-builder</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {matches.length > 0 && (
          <ul className="space-y-2">
            {matches.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.display_name ?? "—"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => share(p)}>
                  Share
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Shared with ({sharedProfiles.length})
          </p>
          {sharedProfiles.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No one yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sharedProfiles.map(({ share: s, profile: p }) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2"
                >
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{p?.display_name ?? p?.email}</div>
                    {p?.display_name && (
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => unshare(s)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Publish ------------------------------- */

function PublishPanel({
  roster,
  onChanged,
}: {
  roster: Roster;
  onChanged: () => void;
}) {
  const defaultSlug =
    roster.slug ?? (normalizeSlug(roster.title).slice(0, 60) || "roster");
  const [slug, setSlug] = useState(defaultSlug);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSlug(roster.slug ?? (normalizeSlug(roster.title).slice(0, 60) || "roster"));
  }, [roster.id, roster.slug, roster.title]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/roster/${slug}`;

  async function publish() {
    const cleaned = normalizeSlug(slug);
    if (cleaned.length < 2) {
      toast.error("Slug must be at least 2 characters (letters, numbers, hyphens).");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("rosters")
      .update({
        slug: cleaned,
        published: true,
        published_at: new Date().toISOString(),
      } as never)
      .eq("id", roster.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("duplicate")
          ? "That URL is taken — try another."
          : error.message,
      );
      return;
    }
    toast.success("Roster published");
    onChanged();
  }

  async function unpublish() {
    setSaving(true);
    const { error } = await supabase
      .from("rosters")
      .update({ published: false } as never)
      .eq("id", roster.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Roster unpublished");
    onChanged();
  }

  async function saveSlug() {
    const cleaned = normalizeSlug(slug);
    if (cleaned.length < 2) {
      toast.error("Slug must be at least 2 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("rosters")
      .update({ slug: cleaned } as never)
      .eq("id", roster.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("duplicate")
          ? "That URL is taken — try another."
          : error.message,
      );
      return;
    }
    toast.success("URL updated");
    onChanged();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Globe className="size-4" /> Publish as page
        </CardTitle>
        <CardDescription>
          Publish this roster as a public page anyone with the link can view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {roster.published ? "Public" : "Private"}
            </div>
            <div className="text-xs text-muted-foreground">
              {roster.published
                ? "Anyone with the link can view this roster."
                : "Only admins and shared users can see it."}
            </div>
          </div>
          <Switch
            checked={roster.published}
            disabled={saving}
            onCheckedChange={(v) => (v ? publish() : unpublish())}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roster-slug" className="text-xs">
            Custom URL
          </Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              /roster/
            </span>
            <Input
              id="roster-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug((s) => normalizeSlug(s))}
              placeholder="summer-launch"
              maxLength={60}
            />
          </div>
          {roster.published && roster.slug && roster.slug !== normalizeSlug(slug) && (
            <Button size="sm" variant="outline" onClick={saveSlug} disabled={saving}>
              Update URL
            </Button>
          )}
        </div>

        {roster.published && roster.slug && (
          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
            <div className="truncate text-xs text-muted-foreground">{publicUrl}</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? (
                  <><Check className="mr-1.5 size-3.5" /> Copied</>
                ) : (
                  <><Copy className="mr-1.5 size-3.5" /> Copy link</>
                )}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/roster/${roster.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 size-3.5" /> Open page
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
