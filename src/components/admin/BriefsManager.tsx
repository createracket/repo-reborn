import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";
import { BriefStatusBadge, BriefStatusSelect, type BriefStatus } from "@/components/briefs/BriefStatusBadge";
import { BudgetDisplay } from "@/components/briefs/BudgetDisplay";
import { BRIEF_CURRENCIES, TRANSPARENCY_OPTIONS, transparencyLabel } from "@/lib/brief-currency";

export type LeadBrief = {
  id: string; created_at: string; title: string; description: string;
  budget: number | null; currency: string | null; transparency: string | null;
  timeline: string | null; core_values: string[];
  collaboration_types: string[]; target_audience: string | null;
  contact_email: string; contact_name: string | null; company: string | null;
  status: string;
};
export type CampaignBrief = {
  id: string; created_at: string; title: string; description: string;
  user_id: string; budget: number | null; currency: string | null; transparency: string | null;
  status: string;
  contact_email: string | null; published: boolean; published_at: string | null;
};
export type Profile = {
  id: string; email: string | null; display_name: string | null;
  account_type: string | null; created_at: string; slug: string | null;
  avatar_url: string | null; is_featured?: boolean | null;
};
type UnifiedBrief =
  | ({ source: "user" } & CampaignBrief)
  | ({ source: "lead" } & LeadBrief & { published?: boolean; published_at?: string | null; user_id?: null });

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

export function BriefsManager() {
  const [leadBriefs, setLeadBriefs] = useState<LeadBrief[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [lb, cb, pr] = await Promise.all([
      supabase.from("lead_briefs").select("*").order("created_at", { ascending: false }),
      supabase.from("campaign_briefs").select("id, created_at, title, description, user_id, budget, currency, transparency, status, contact_email, published, published_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, display_name, account_type, created_at, slug, avatar_url, is_featured").order("created_at", { ascending: false }),
    ]);
    setLeadBriefs((lb.data as LeadBrief[]) ?? []);
    setCampaigns((cb.data as CampaignBrief[]) ?? []);
    setProfiles((pr.data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const profileByEmail = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => { if (p.email) m.set(p.email.trim().toLowerCase(), p); });
    return m;
  }, [profiles]);
  const lookupProfile = (email?: string | null) =>
    email ? profileByEmail.get(email.trim().toLowerCase()) ?? null : null;

  const totalCount = leadBriefs.length + campaigns.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Campaign Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage every brief in one place — briefs from signed-in users and lead submissions
          both appear here (<span className="font-medium text-foreground">{totalCount}</span> in
          total right now — no cap, every brief is shown). Change the status to keep the user's
          Project Planner in sync. Toggle{" "}
          <span className="font-medium text-foreground">Publish as opportunity</span> to surface
          a user brief on every signed-in artist's dashboard.
        </p>
      </div>

      <NewCampaignBriefForm onCreated={loadAll} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading briefs…</p>
      ) : (
        <UnifiedBriefs
          leads={leadBriefs}
          campaigns={campaigns}
          lookupProfile={lookupProfile}
          profiles={profiles}
          onLeadStatusChanged={(id, next) =>
            setLeadBriefs((rows) => rows.map((r) => (r.id === id ? { ...r, status: next } : r)))
          }
          onCampaignStatusChanged={(id, next) =>
            setCampaigns((rows) => rows.map((r) => (r.id === id ? { ...r, status: next } : r)))
          }
          onCampaignPublishChanged={(id, published, published_at) =>
            setCampaigns((rows) =>
              rows.map((r) => (r.id === id ? { ...r, published, published_at } : r)),
            )
          }
          onLeadUpdated={(id, patch) =>
            setLeadBriefs((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } as LeadBrief : r)))
          }
          onCampaignUpdated={(id, patch) =>
            setCampaigns((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } as CampaignBrief : r)))
          }
          onLeadDeleted={(id) => setLeadBriefs((rows) => rows.filter((r) => r.id !== id))}
          onCampaignDeleted={(id) => setCampaigns((rows) => rows.filter((r) => r.id !== id))}
        />
      )}
    </div>
  );
}

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

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No briefs yet.</p>;
  }

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
              <div className="text-xs">
                <span className="uppercase tracking-wider text-muted-foreground">Budget:</span>{" "}
                <BudgetDisplay amount={b.budget} currency={b.currency} />
              </div>
              {b.transparency ? (
                <KV k="Transparency" v={transparencyLabel(b.transparency) ?? b.transparency} />
              ) : null}
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
              <BriefShares
                briefSource={isUser ? "user" : "lead"}
                briefId={b.id}
                profiles={profiles}
              />
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
        currency: brief.currency ?? "GBP",
        transparency: brief.transparency ?? "",
        contact_email: brief.contact_email ?? "",
      });
    } else {
      setForm({
        title: brief.title,
        description: brief.description,
        budget: brief.budget ?? "",
        currency: brief.currency ?? "GBP",
        transparency: brief.transparency ?? "",
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
      currency: form.currency || "GBP",
      transparency: form.transparency || null,
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
              <Label>Budget</Label>
              <div className="flex gap-2">
                <select
                  value={form.currency ?? "GBP"}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  {BRIEF_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Input type="number" value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Contact email</Label>
              <Input value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Transparency</Label>
            <select
              value={form.transparency ?? ""}
              onChange={(e) => setForm({ ...form, transparency: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {TRANSPARENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-xs">
      <span className="uppercase tracking-wider text-muted-foreground">{k}:</span>{" "}
      <span>{v}</span>
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

function NewCampaignBriefForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    contact_email: "",
    budget: "",
    currency: "GBP",
    transparency: "",
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
        currency: form.currency || "GBP",
        transparency: form.transparency || null,
        timeline: form.timeline.trim() || null,
        target_audience: form.target_audience.trim() || null,
        collaboration_types: types,
        core_values: values,
        status: form.status || "in_review",
      } as any);
      if (error) throw error;
      toast.success("Campaign brief added");
      setForm({ title: "", description: "", contact_email: "", budget: "", currency: "GBP", transparency: "", timeline: "", target_audience: "", status: "in_review" });
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
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between gap-3 p-6 text-left">
            <div>
              <CardTitle className="font-display text-2xl flex items-center gap-2">
                <Plus className="h-5 w-5" /> Add a campaign brief
              </CardTitle>
              <CardDescription className="mt-1">
                Manually create a brief using the same fields as the public submission form.
              </CardDescription>
            </div>
            {open ? <ChevronDown className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
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
            <Label htmlFor="cb-budget">Estimated budget</Label>
            <div className="flex gap-2">
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                {BRIEF_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Input id="cb-budget" type="number" min={0} value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="cb-transparency">Transparency</Label>
            <select
              id="cb-transparency"
              value={form.transparency}
              onChange={(e) => setForm((f) => ({ ...f, transparency: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {TRANSPARENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

type BriefShareRow = {
  id: string;
  brief_source: "user" | "lead";
  brief_id: string;
  target_user_id: string | null;
  target_email: string | null;
  created_at: string;
};

function BriefShares({
  briefSource,
  briefId,
  profiles,
}: {
  briefSource: "user" | "lead";
  briefId: string;
  profiles: Profile[];
}) {
  const [shares, setShares] = useState<BriefShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("campaign_brief_shares")
      .select("id, brief_source, brief_id, target_user_id, target_email, created_at")
      .eq("brief_source", briefSource)
      .eq("brief_id", briefId)
      .order("created_at", { ascending: false });
    setShares((data as BriefShareRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [briefSource, briefId]);

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Profile[];
    const taken = new Set(shares.map((s) => s.target_user_id).filter(Boolean) as string[]);
    return profiles
      .filter(
        (p) =>
          !taken.has(p.id) &&
          ((p.display_name ?? "").toLowerCase().includes(q) ||
            (p.email ?? "").toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [query, profiles, shares]);

  async function addShare(patch: { target_user_id?: string | null; target_email?: string | null }) {
    setBusy(true);
    const { error } = await supabase.from("campaign_brief_shares").insert({
      brief_source: briefSource,
      brief_id: briefId,
      target_user_id: patch.target_user_id ?? null,
      target_email: patch.target_email ?? null,
    } as any);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuery("");
    setEmail("");
    toast.success("Shared");
    load();
  }

  async function removeShare(id: string) {
    const prev = shares;
    setShares((s) => s.filter((r) => r.id !== id));
    const { error } = await supabase.from("campaign_brief_shares").delete().eq("id", id);
    if (error) {
      setShares(prev);
      toast.error(error.message);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Share privately with users</div>
          <p className="text-xs text-muted-foreground">
            Recipients see this brief on their dashboard opportunities, even if it isn't published.
          </p>
        </div>
        {shares.length > 0 ? (
          <Badge variant="outline" className="text-[10px]">{shares.length} shared</Badge>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : shares.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {shares.map((s) => {
            const p = s.target_user_id ? profileById.get(s.target_user_id) : null;
            const label = p?.display_name || p?.email || s.target_email || "Unknown user";
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1 text-xs">
                <span className="truncate">
                  {label}
                  {s.target_user_id ? (
                    <span className="ml-1 text-muted-foreground">· account</span>
                  ) : (
                    <span className="ml-1 text-muted-foreground">· email invite</span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-destructive hover:text-destructive"
                  onClick={() => removeShare(s.id)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Label className="text-xs">Search accounts</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="h-8 text-sm"
          />
          {suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border/60 bg-popover shadow">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => addShare({ target_user_id: p.id })}
                  disabled={busy}
                >
                  {p.display_name ?? "Member"} <span className="text-muted-foreground">{p.email ?? ""}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <Label className="text-xs">Or invite by email</Label>
          <div className="flex gap-1">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@example.com"
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              type="button"
              disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
              onClick={() => addShare({ target_email: email.trim().toLowerCase() })}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
