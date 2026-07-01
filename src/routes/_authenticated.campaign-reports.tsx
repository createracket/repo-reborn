import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Plus,
  RefreshCw,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSlug, validateSlug } from "@/lib/slugs";
import { detectPlatform, formatCount } from "@/lib/youtube-utils";
import { scrapePostMetrics } from "@/lib/campaign-scrapers.functions";

const sb = supabase as any;

export const Route = createFileRoute("/_authenticated/campaign-reports")({
  head: () => ({
    meta: [
      { title: "Campaign Reports — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CampaignReportsPage,
});

type Report = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  header_image_url: string | null;
  client_email: string | null;
  brand_email: string | null;
  source_roster_id: string | null;
  created_at: string;
  updated_at: string;
};

type Creator = {
  id: string;
  report_id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  position: number;
};

type FeaturedComment = {
  handle?: string;
  avatar_url?: string;
  text?: string;
  meta?: string;
};

type Post = {
  id: string;
  creator_id: string;
  platform: "instagram" | "tiktok" | "youtube";
  post_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  posted_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach_pct: number | null;
  engagement_rate_pct: number | null;
  interaction_pct: number | null;
  watch_time_hours: number | null;
  sentiment_score: number | null;
  featured_comments: FeaturedComment[];
  hashtags: string[];
  brand_tag: string | null;
  position: number;
  metrics_updated_at: string | null;
};

type RosterOpt = { id: string; title: string };

function CampaignReportsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [rosterOpts, setRosterOpts] = useState<RosterOpt[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(u.user.id);
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);
      await loadReports();
      const { data: r } = await supabase
        .from("rosters")
        .select("id, title")
        .order("updated_at", { ascending: false });
      setRosterOpts((r as RosterOpt[]) ?? []);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = useCallback(async () => {
    const { data, error } = await sb
      .from("campaign_reports")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) return toast.error(error.message);
    setReports((data as Report[]) ?? []);
  }, []);

  const loadDetail = useCallback(async (reportId: string) => {
    const { data: cr } = await sb
      .from("campaign_report_creators")
      .select("*")
      .eq("report_id", reportId)
      .order("position", { ascending: true });
    const creatorList = (cr as Creator[]) ?? [];
    setCreators(creatorList);
    if (creatorList.length === 0) {
      setPosts([]);
      return;
    }
    const { data: pr } = await sb
      .from("campaign_report_posts")
      .select("*")
      .in(
        "creator_id",
        creatorList.map((c) => c.id),
      )
      .order("position", { ascending: true });
    setPosts((pr as Post[]) ?? []);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else {
      setCreators([]);
      setPosts([]);
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
                Campaign Reports is currently admin-only.
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

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Campaign Reports</h1>
            <p className="mt-2 text-muted-foreground">
              Build live campaign performance reports. Pull metrics automatically from Instagram, TikTok and YouTube, or enter them manually.
            </p>
          </div>
          {selected && (
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="mr-2 size-4" /> All reports
            </Button>
          )}
        </div>

        {!selected ? (
          <ReportListView
            reports={reports}
            rosterOpts={rosterOpts}
            userId={userId}
            onCreated={async (id) => {
              await loadReports();
              setSelectedId(id);
            }}
            onSelect={setSelectedId}
            onDeleted={loadReports}
          />
        ) : (
          <ReportDetailView
            report={selected}
            creators={creators}
            posts={posts}
            onChanged={async () => {
              await Promise.all([loadReports(), loadDetail(selected.id)]);
            }}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------ List ------------------------------ */

function ReportListView({
  reports,
  rosterOpts,
  userId,
  onCreated,
  onSelect,
  onDeleted,
}: {
  reports: Report[];
  rosterOpts: RosterOpt[];
  userId: string | null;
  onCreated: (id: string) => void;
  onSelect: (id: string) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seedRoster, setSeedRoster] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    setCreating(true);
    const slugBase = normalizeSlug(title) || `report-${Date.now()}`;
    const v = validateSlug(slugBase);
    const slug = (v.ok ? v.normalized : `report-${Date.now()}`) + `-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb
      .from("campaign_reports")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        owner_id: userId,
        slug,
        source_roster_id: seedRoster !== "none" ? seedRoster : null,
      })
      .select("id")
      .single();
    if (error) {
      setCreating(false);
      return toast.error(error.message);
    }
    const newId = (data as { id: string }).id;

    // Seed creators from roster items if requested
    if (seedRoster !== "none") {
      const { data: items } = await supabase
        .from("roster_items")
        .select("name, avatar_url, position, instagram_url")
        .eq("roster_id", seedRoster)
        .order("position", { ascending: true });
      const rows = ((items as any[]) ?? []).map((it, i) => ({
        report_id: newId,
        name: it.name,
        avatar_url: it.avatar_url,
        handle: it.instagram_url ? `@${it.instagram_url.split("/").filter(Boolean).pop() ?? ""}` : null,
        position: it.position ?? i,
      }));
      if (rows.length > 0) {
        await sb.from("campaign_report_creators").insert(rows);
      }
    }

    setCreating(false);
    setTitle("");
    setDescription("");
    setSeedRoster("none");
    toast.success("Report created");
    onCreated(newId);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign report? All creators and posts will be removed.")) return;
    const { error } = await sb.from("campaign_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onDeleted();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Reports</CardTitle>
          <CardDescription>All campaign reports you've built.</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                >
                  <button type="button" onClick={() => onSelect(r.id)} className="flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      {r.published ? (
                        <Badge className="border-transparent bg-green-500/20 text-foreground text-[10px] uppercase">
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                          Draft
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">New report</CardTitle>
          <CardDescription>Seed creators from an existing roster, or start blank.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="seed-roster">Seed from roster</Label>
              <Select value={seedRoster} onValueChange={setSeedRoster}>
                <SelectTrigger id="seed-roster">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start blank</SelectItem>
                  {rosterOpts.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-title">Title</Label>
              <Input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Silverchair — Tixel campaign wrap"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-desc">Description</Label>
              <Textarea
                id="report-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary shown on the public page"
                rows={3}
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={creating || !title.trim()} className="w-full">
              {creating ? "Creating…" : "Create report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Detail ------------------------------ */

function ReportDetailView({
  report,
  creators,
  posts,
  onChanged,
}: {
  report: Report;
  creators: Creator[];
  posts: Post[];
  onChanged: () => Promise<void>;
}) {
  const [savingMeta, setSavingMeta] = useState(false);
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description ?? "");
  const [slug, setSlug] = useState(report.slug);
  const [header, setHeader] = useState(report.header_image_url ?? "");
  const [clientEmail, setClientEmail] = useState(report.client_email ?? "");
  const [brandEmail, setBrandEmail] = useState(report.brand_email ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTitle(report.title);
    setDescription(report.description ?? "");
    setSlug(report.slug);
    setHeader(report.header_image_url ?? "");
    setClientEmail(report.client_email ?? "");
    setBrandEmail(report.brand_email ?? "");
  }, [report.id]);

  async function saveMeta() {
    setSavingMeta(true);
    const v = validateSlug(slug);
    if (!v.ok) {
      setSavingMeta(false);
      return toast.error(v.reason);
    }
    const { error } = await sb
      .from("campaign_reports")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        slug: v.normalized,
        header_image_url: header.trim() || null,
        client_email: clientEmail.trim().toLowerCase() || null,
        brand_email: brandEmail.trim().toLowerCase() || null,
      })
      .eq("id", report.id);
    setSavingMeta(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    await onChanged();
  }

  async function togglePublished(next: boolean) {
    const { error } = await sb
      .from("campaign_reports")
      .update({ published: next, published_at: next ? new Date().toISOString() : null })
      .eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published" : "Unpublished");
    await onChanged();
  }

  async function addCreator() {
    const { error } = await sb.from("campaign_report_creators").insert({
      report_id: report.id,
      name: "New creator",
      position: creators.length,
    });
    if (error) return toast.error(error.message);
    await onChanged();
  }

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/report/${report.slug}` : `/report/${report.slug}`;

  return (
    <div className="space-y-6">
      {/* Meta card */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="font-display text-2xl">Report details</CardTitle>
            <CardDescription>Editable metadata and share settings.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {report.published ? "Published" : "Draft"}
            </span>
            <Switch checked={report.published} onCheckedChange={togglePublished} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <div className="flex gap-2">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Public URL: <a href={publicUrl} target="_blank" rel="noreferrer" className="text-primary underline">/report/{slug}</a>
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Header image URL</Label>
            <Input
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label>Client email</Label>
            <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Brand email</Label>
            <Input value={brandEmail} onChange={(e) => setBrandEmail(e.target.value)} type="email" />
          </div>
          <div className="md:col-span-2 flex justify-between gap-2">
            <Button asChild variant="outline">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Globe className="mr-2 size-4" /> View public page
              </a>
            </Button>
            <Button onClick={saveMeta} disabled={savingMeta}>
              {savingMeta ? "Saving…" : "Save details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Creators */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-display text-2xl">Creators & posts</CardTitle>
            <CardDescription>Add creators and their live posts. Metrics can be auto-fetched or entered manually.</CardDescription>
          </div>
          <Button onClick={addCreator}>
            <Plus className="mr-2 size-4" /> Add creator
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {creators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creators yet.</p>
          ) : (
            creators.map((c) => (
              <CreatorRow
                key={c.id}
                creator={c}
                posts={posts.filter((p) => p.creator_id === c.id)}
                onChanged={onChanged}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Creator row ------------------------------ */

function CreatorRow({
  creator,
  posts,
  onChanged,
}: {
  creator: Creator;
  posts: Post[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(creator.name);
  const [handle, setHandle] = useState(creator.handle ?? "");
  const [avatar, setAvatar] = useState(creator.avatar_url ?? "");

  useEffect(() => {
    setName(creator.name);
    setHandle(creator.handle ?? "");
    setAvatar(creator.avatar_url ?? "");
  }, [creator.id]);

  async function saveCreator() {
    const { error } = await sb
      .from("campaign_report_creators")
      .update({
        name: name.trim() || "Creator",
        handle: handle.trim() || null,
        avatar_url: avatar.trim() || null,
      })
      .eq("id", creator.id);
    if (error) return toast.error(error.message);
    toast.success("Creator saved");
    await onChanged();
  }

  async function deleteCreator() {
    if (!confirm("Delete this creator and all their posts?")) return;
    const { error } = await sb.from("campaign_report_creators").delete().eq("id", creator.id);
    if (error) return toast.error(error.message);
    await onChanged();
  }

  async function addPost() {
    const { error } = await sb.from("campaign_report_posts").insert({
      creator_id: creator.id,
      platform: "instagram",
      position: posts.length,
      featured_comments: [],
      hashtags: [],
    });
    if (error) return toast.error(error.message);
    await onChanged();
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <Input placeholder="Avatar URL" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveCreator}>Save</Button>
            <Button size="icon" variant="ghost" onClick={deleteCreator}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/60 p-4 space-y-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live posts yet.</p>
          ) : (
            posts.map((p) => <PostEditor key={p.id} post={p} onChanged={onChanged} />)
          )}
          <Button variant="outline" size="sm" onClick={addPost}>
            <Plus className="mr-2 size-4" /> Add live post
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Post editor ------------------------------ */

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}

function PostEditor({ post, onChanged }: { post: Post; onChanged: () => Promise<void> }) {
  const scrape = useServerFn(scrapePostMetrics);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [form, setForm] = useState({
    platform: post.platform,
    post_url: post.post_url ?? "",
    thumbnail_url: post.thumbnail_url ?? "",
    caption: post.caption ?? "",
    posted_at: post.posted_at ? post.posted_at.slice(0, 10) : "",
    views: post.views?.toString() ?? "",
    likes: post.likes?.toString() ?? "",
    comments: post.comments?.toString() ?? "",
    shares: post.shares?.toString() ?? "",
    saves: post.saves?.toString() ?? "",
    reach_pct: post.reach_pct?.toString() ?? "",
    engagement_rate_pct: post.engagement_rate_pct?.toString() ?? "",
    interaction_pct: post.interaction_pct?.toString() ?? "",
    watch_time_hours: post.watch_time_hours?.toString() ?? "",
    sentiment_score: post.sentiment_score ?? 50,
    hashtags: (post.hashtags ?? []).join(" "),
    brand_tag: post.brand_tag ?? "",
    featured_comments: post.featured_comments ?? [],
  });

  useEffect(() => {
    setForm({
      platform: post.platform,
      post_url: post.post_url ?? "",
      thumbnail_url: post.thumbnail_url ?? "",
      caption: post.caption ?? "",
      posted_at: post.posted_at ? post.posted_at.slice(0, 10) : "",
      views: post.views?.toString() ?? "",
      likes: post.likes?.toString() ?? "",
      comments: post.comments?.toString() ?? "",
      shares: post.shares?.toString() ?? "",
      saves: post.saves?.toString() ?? "",
      reach_pct: post.reach_pct?.toString() ?? "",
      engagement_rate_pct: post.engagement_rate_pct?.toString() ?? "",
      interaction_pct: post.interaction_pct?.toString() ?? "",
      watch_time_hours: post.watch_time_hours?.toString() ?? "",
      sentiment_score: post.sentiment_score ?? 50,
      hashtags: (post.hashtags ?? []).join(" "),
      brand_tag: post.brand_tag ?? "",
      featured_comments: post.featured_comments ?? [],
    });
  }, [post.id]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function savePost() {
    setSaving(true);
    const { error } = await sb
      .from("campaign_report_posts")
      .update({
        platform: form.platform,
        post_url: form.post_url.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        caption: form.caption.trim() || null,
        posted_at: form.posted_at ? new Date(form.posted_at).toISOString() : null,
        views: numOrNull(form.views),
        likes: numOrNull(form.likes),
        comments: numOrNull(form.comments),
        shares: numOrNull(form.shares),
        saves: numOrNull(form.saves),
        reach_pct: numOrNull(form.reach_pct),
        engagement_rate_pct: numOrNull(form.engagement_rate_pct),
        interaction_pct: numOrNull(form.interaction_pct),
        watch_time_hours: numOrNull(form.watch_time_hours),
        sentiment_score: form.sentiment_score,
        hashtags: form.hashtags
          .split(/\s+/)
          .map((h) => h.replace(/^#/, "").trim())
          .filter(Boolean),
        brand_tag: form.brand_tag.trim() || null,
        featured_comments: form.featured_comments,
      })
      .eq("id", post.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Post saved");
    await onChanged();
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    const { error } = await sb.from("campaign_report_posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    await onChanged();
  }

  async function handleScrape() {
    if (!form.post_url.trim()) {
      toast.error("Enter a post URL first");
      return;
    }
    setScraping(true);
    try {
      const result = await scrape({ data: { url: form.post_url.trim() } });
      if (!result.ok) {
        toast.error(result.error);
        setScraping(false);
        return;
      }
      const m = result.metrics;
      const detected = detectPlatform(form.post_url) ?? form.platform;
      const patch = {
        platform: detected,
        thumbnail_url: m.thumbnail_url ?? form.thumbnail_url,
        caption: m.caption ?? form.caption,
        posted_at: m.posted_at ? m.posted_at.slice(0, 10) : form.posted_at,
        views: m.views != null ? String(m.views) : form.views,
        likes: m.likes != null ? String(m.likes) : form.likes,
        comments: m.comments != null ? String(m.comments) : form.comments,
        shares: m.shares != null ? String(m.shares) : form.shares,
        saves: m.saves != null ? String(m.saves) : form.saves,
        hashtags: (m.hashtags ?? []).length > 0 ? (m.hashtags ?? []).join(" ") : form.hashtags,
      };
      setForm((f) => ({ ...f, ...patch }));

      // Persist the scraped metrics + timestamp
      await sb
        .from("campaign_report_posts")
        .update({
          platform: detected,
          thumbnail_url: patch.thumbnail_url || null,
          caption: patch.caption || null,
          posted_at: patch.posted_at ? new Date(patch.posted_at).toISOString() : null,
          views: numOrNull(patch.views),
          likes: numOrNull(patch.likes),
          comments: numOrNull(patch.comments),
          shares: numOrNull(patch.shares),
          saves: numOrNull(patch.saves),
          hashtags: patch.hashtags
            .split(/\s+/)
            .map((h) => h.replace(/^#/, "").trim())
            .filter(Boolean),
          metrics_updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      toast.success("Metrics fetched");
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={form.platform} onValueChange={(v) => set("platform", v as Post["platform"])}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="flex-1 min-w-[240px]"
          placeholder="https://…"
          value={form.post_url}
          onChange={(e) => set("post_url", e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={handleScrape} disabled={scraping}>
          <RefreshCw className={"mr-2 size-4 " + (scraping ? "animate-spin" : "")} />
          {scraping ? "Fetching…" : "Fetch metrics"}
        </Button>
        {form.post_url && (
          <Button size="icon" variant="ghost" asChild>
            <a href={form.post_url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        <div className="ml-auto flex gap-1 text-xs text-muted-foreground">
          {formatCount(numOrNull(form.views) ?? 0)} views · {formatCount(numOrNull(form.likes) ?? 0)} likes
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <NumField label="Views" v={form.views} on={(x) => set("views", x)} />
        <NumField label="Likes" v={form.likes} on={(x) => set("likes", x)} />
        <NumField label="Comments" v={form.comments} on={(x) => set("comments", x)} />
        <NumField label="Shares" v={form.shares} on={(x) => set("shares", x)} />
        <NumField label="Saves" v={form.saves} on={(x) => set("saves", x)} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {expanded ? "Hide" : "Show"} advanced fields (sentiment, ER %, watch time, comments)
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div className="grid gap-3 md:grid-cols-4">
            <NumField label="Reach %" v={form.reach_pct} on={(x) => set("reach_pct", x)} />
            <NumField label="ER %" v={form.engagement_rate_pct} on={(x) => set("engagement_rate_pct", x)} />
            <NumField label="Interaction %" v={form.interaction_pct} on={(x) => set("interaction_pct", x)} />
            <NumField label="Watch time (h)" v={form.watch_time_hours} on={(x) => set("watch_time_hours", x)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Sentiment ({form.sentiment_score}/100)</Label>
            <Slider
              value={[form.sentiment_score]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => set("sentiment_score", v[0])}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Thumbnail URL</Label>
              <Input value={form.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posted date</Label>
              <Input type="date" value={form.posted_at} onChange={(e) => set("posted_at", e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Caption</Label>
              <Textarea value={form.caption} onChange={(e) => set("caption", e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hashtags (space-separated)</Label>
              <Input value={form.hashtags} onChange={(e) => set("hashtags", e.target.value)} placeholder="#ad #campaign" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Brand tag</Label>
              <Input value={form.brand_tag} onChange={(e) => set("brand_tag", e.target.value)} placeholder="e.g. Silverchair" />
            </div>
          </div>

          <FeaturedCommentsEditor
            value={form.featured_comments}
            onChange={(v) => set("featured_comments", v)}
          />
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border/60">
        {post.metrics_updated_at ? (
          <p className="text-[10px] text-muted-foreground">
            Metrics fetched {new Date(post.metrics_updated_at).toLocaleString()}
          </p>
        ) : <span />}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={deletePost}>
            <Trash2 className="mr-2 size-4" /> Delete
          </Button>
          <Button size="sm" onClick={savePost} disabled={saving}>
            {saving ? "Saving…" : "Save post"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} inputMode="decimal" />
    </div>
  );
}

function FeaturedCommentsEditor({
  value,
  onChange,
}: {
  value: FeaturedComment[];
  onChange: (v: FeaturedComment[]) => void;
}) {
  function update(i: number, patch: Partial<FeaturedComment>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    if (value.length >= 3) return;
    onChange([...value, { handle: "", text: "" }]);
  }
  return (
    <div className="space-y-2">
      <Label className="text-xs">Featured comments (up to 3)</Label>
      {value.map((c, i) => (
        <div key={i} className="grid gap-2 md:grid-cols-[140px_140px_1fr_120px_auto] rounded-md border border-border/60 p-2">
          <Input placeholder="@handle" value={c.handle ?? ""} onChange={(e) => update(i, { handle: e.target.value })} />
          <Input placeholder="Avatar URL" value={c.avatar_url ?? ""} onChange={(e) => update(i, { avatar_url: e.target.value })} />
          <Input placeholder="Comment text" value={c.text ?? ""} onChange={(e) => update(i, { text: e.target.value })} />
          <Input placeholder="Meta (e.g. 13w · 2 likes)" value={c.meta ?? ""} onChange={(e) => update(i, { meta: e.target.value })} />
          <Button size="icon" variant="ghost" onClick={() => remove(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {value.length < 3 && (
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="mr-2 size-4" /> Add comment
        </Button>
      )}
    </div>
  );
}
