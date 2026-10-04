import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUser } from "@/hooks/use-auth";
import { BriefsManager } from "@/components/admin/BriefsManager";

type Campaign = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  notes: string | null;
  display_order: number;
};
type Kind = "collab" | "page" | "roster" | "report";
type Item = {
  kind: Kind;
  id: string;
  title: string;
  slug: string | null;
  published: boolean;
  dashboard?: boolean;
  campaign_id: string | null;
};

const STATUSES = ["draft", "active", "wrapped", "archived"];
const TABLE: Record<Kind, "campaign_briefs" | "partner_pages" | "rosters" | "campaign_reports"> = {
  collab: "campaign_briefs",
  page: "partner_pages",
  roster: "rosters",
  report: "campaign_reports",
};
const KIND_LABEL: Record<Kind, string> = {
  collab: "Collab brief",
  page: "Brief page",
  roster: "Roster",
  report: "Report",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

async function loadAll(): Promise<{ campaigns: Campaign[]; items: Item[] }> {
  const [c, cb, pp, ro, re] = await Promise.all([
    sb.from("campaigns").select("id,title,client_name,status,notes,display_order").order("display_order").order("created_at", { ascending: false }),
    sb.from("campaign_briefs").select("id,title,published,campaign_id"),
    sb.from("partner_pages").select("id,headline,slug,published,dashboard_visible,campaign_id").eq("section", "brief").eq("archived", false),
    sb.from("rosters").select("id,title,slug,published,campaign_id"),
    sb.from("campaign_reports").select("id,title,slug,published,campaign_id"),
  ]);
  for (const r of [c, cb, pp, ro, re]) if (r.error) throw r.error;
  const items: Item[] = [
    ...cb.data.map((r: any) => ({ kind: "collab" as const, id: r.id, title: r.title, slug: null, published: r.published, campaign_id: r.campaign_id })),
    ...pp.data.map((r: any) => ({ kind: "page" as const, id: r.id, title: r.headline, slug: r.slug, published: r.published, dashboard: r.dashboard_visible, campaign_id: r.campaign_id })),
    ...ro.data.map((r: any) => ({ kind: "roster" as const, id: r.id, title: r.title, slug: r.slug, published: r.published, campaign_id: r.campaign_id })),
    ...re.data.map((r: any) => ({ kind: "report" as const, id: r.id, title: r.title, slug: r.slug, published: r.published, campaign_id: r.campaign_id })),
  ];
  return { campaigns: c.data, items };
}

function editHref(it: Item): { to: string; search?: Record<string, string>; params?: Record<string, string> } {
  if (it.kind === "roster") return { to: "/roster-builder", search: { edit: it.id } };
  if (it.kind === "report") return { to: "/campaign-reports", search: { edit: it.id } };
  if (it.kind === "page") return { to: "/briefs/edit/$key", params: { key: it.slug ?? it.id } };
  return { to: "/campaign-builder" };
}
function liveHref(it: Item): string | null {
  if (!it.slug || !it.published) return null;
  if (it.kind === "roster") return `/roster/${it.slug}`;
  if (it.kind === "report") return `/report/${it.slug}`;
  if (it.kind === "page") return `/brief/${it.slug}`;
  return null;
}

export function CampaignManager() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");

  async function refresh() {
    try {
      const d = await loadAll();
      setCampaigns(d.campaigns);
      setItems(d.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const byCampaign = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const it of items) (m[it.campaign_id ?? "none"] ??= []).push(it);
    return m;
  }, [items]);

  async function createCampaign() {
    if (!newTitle.trim()) return;
    const { error } = await sb.from("campaigns").insert({ title: newTitle.trim(), client_name: newClient.trim() || null, status: "draft" });
    if (error) return toast.error(error.message);
    setNewTitle("");
    setNewClient("");
    toast.success("Campaign created");
    refresh();
  }

  async function updateCampaign(id: string, patch: Partial<Campaign>) {
    setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await sb.from("campaigns").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function setLink(it: Item, campaignId: string | null) {
    const { error } = await sb.from(TABLE[it.kind]).update({ campaign_id: campaignId }).eq("id", it.id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.map((x) => (x.kind === it.kind && x.id === it.id ? { ...x, campaign_id: campaignId } : x)));
  }

  async function setFlag(it: Item, field: "published" | "dashboard_visible", value: boolean) {
    const patch: Record<string, unknown> = { [field]: value };
    if (field === "published" && it.kind !== "page") patch.published_at = value ? new Date().toISOString() : null;
    const { error } = await sb.from(TABLE[it.kind]).update(patch).eq("id", it.id);
    if (error) return toast.error(error.message);
    setItems((xs) =>
      xs.map((x) =>
        x.kind === it.kind && x.id === it.id ? { ...x, ...(field === "published" ? { published: value } : { dashboard: value }) } : x,
      ),
    );
  }

  async function createLinked(c: Campaign, kind: "roster" | "report") {
    const { data: u } = await getAuthUser();
    if (!u.user) return;
    const title = `${c.title} — ${kind === "roster" ? "Roster" : "Report"}`;
    const payload: Record<string, unknown> = { title, owner_id: u.user.id, campaign_id: c.id };
    if (kind === "report") payload.slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb.from(TABLE[kind]).insert(payload).select("id").single();
    if (error) return toast.error(error.message);
    navigate({ to: kind === "roster" ? "/roster-builder" : "/campaign-reports", search: { edit: data.id } });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading campaigns…</p>;

  const unassigned = byCampaign["none"] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Campaign Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start here. Each campaign groups its briefs, rosters and reports, and controls what's live.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 pt-6">
          <Input className="max-w-xs" placeholder="New campaign name" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Input className="max-w-xs" placeholder="Client (optional)" value={newClient} onChange={(e) => setNewClient(e.target.value)} />
          <Button onClick={createCampaign} disabled={!newTitle.trim()}>
            <Plus className="mr-1 h-4 w-4" /> New campaign
          </Button>
        </CardContent>
      </Card>

      {[...campaigns.filter((c) => c.status !== "archived"), ...campaigns.filter((c) => c.status === "archived")].map((c, idx, arr) => {
        const linked = byCampaign[c.id] ?? [];
        const isOpen = !!open[c.id];
        const isArchived = c.status === "archived";
        const firstArchived = isArchived && (idx === 0 || arr[idx - 1].status !== "archived");
        return (
          <div key={c.id} className="space-y-3">
          {firstArchived && <h2 className="pt-4 text-sm font-semibold text-muted-foreground">Archived campaigns</h2>}
          <Card className={isArchived ? "opacity-70" : undefined}>
            <CardHeader className="pb-3">
              <div className="flex w-full items-center gap-2">
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() => setOpen((o) => ({ ...o, [c.id]: !isOpen }))}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-lg">{c.title}</CardTitle>
                {c.client_name && <span className="text-sm text-muted-foreground">· {c.client_name}</span>}
                <Badge variant="outline" className="ml-auto capitalize">{c.status}</Badge>
                <span className="text-xs text-muted-foreground">{linked.length} linked</span>
              </button>
              <Button
                size="sm"
                variant="ghost"
                title={isArchived ? "Restore campaign" : "Archive campaign"}
                onClick={() => {
                  updateCampaign(c.id, { status: isArchived ? "draft" : "archived" });
                  toast.success(isArchived ? "Campaign restored as Draft" : "Campaign archived");
                }}
              >
                {isArchived ? <ArchiveRestore className="mr-1 h-4 w-4" /> : <Archive className="mr-1 h-4 w-4" />}
                {isArchived ? "Restore" : "Archive"}
              </Button>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="space-y-5">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input defaultValue={c.title} onBlur={(e) => e.target.value.trim() && e.target.value !== c.title && updateCampaign(c.id, { title: e.target.value.trim() })} />
                  <Input placeholder="Client" defaultValue={c.client_name ?? ""} onBlur={(e) => updateCampaign(c.id, { client_name: e.target.value.trim() || null })} />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm capitalize"
                    value={c.status}
                    onChange={(e) => updateCampaign(c.id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Textarea className="md:col-span-3" rows={2} placeholder="Notes" defaultValue={c.notes ?? ""} onBlur={(e) => updateCampaign(c.id, { notes: e.target.value || null })} />
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Collab briefs</h3>
                  <BriefsManager key={linked.filter((i) => i.kind === "collab").map((i) => i.id).join(",")} campaignId={c.id} onChanged={refresh} />
                  <select
                    aria-label={`Link existing collab brief to ${c.title}`}
                    className="h-8 max-w-xs rounded-md border border-input bg-background px-2 text-xs"
                    value=""
                    onChange={(e) => {
                      const it = items.find((a) => a.kind === "collab" && a.id === e.target.value);
                      if (it) setLink(it, c.id);
                    }}
                  >
                    <option value="">Link existing collab brief…</option>
                    {items.filter((i) => i.kind === "collab" && i.campaign_id !== c.id).map((i) => (
                      <option key={i.id} value={i.id}>{i.title}{i.campaign_id ? " (move)" : ""}</option>
                    ))}
                  </select>
                </section>
                {(["page", "roster", "report"] as Kind[]).map((kind) => {
                  const rows = linked.filter((i) => i.kind === kind);
                  const available = items.filter((i) => i.kind === kind && i.campaign_id !== c.id);
                  return (
                    <section key={kind} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{KIND_LABEL[kind]}s</h3>
                        {kind === "roster" && (
                          <Button size="sm" variant="outline" onClick={() => createLinked(c, "roster")}><Plus className="mr-1 h-3 w-3" />New roster</Button>
                        )}
                        {kind === "report" && (
                          <Button size="sm" variant="outline" onClick={() => createLinked(c, "report")}><Plus className="mr-1 h-3 w-3" />New report</Button>
                        )}
                        {kind === "page" && (
                          <Button size="sm" variant="outline" asChild><Link to="/briefs"><Plus className="mr-1 h-3 w-3" />New brief page</Link></Button>
                        )}
                        <select
                          className="h-8 max-w-xs rounded-md border border-input bg-background px-2 text-xs"
                          value=""
                          onChange={(e) => {
                            const it = available.find((a) => a.id === e.target.value);
                            if (it) setLink(it, c.id);
                          }}
                        >
                          <option value="">Link existing…</option>
                          {available.map((a) => (
                            <option key={a.id} value={a.id}>{a.title}{a.campaign_id ? " (move)" : ""}</option>
                          ))}
                        </select>
                      </div>
                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">None linked yet.</p>
                      ) : (
                        <ul className="divide-y rounded-md border">
                          {rows.map((it) => <ItemRow key={it.id} it={it} onFlag={setFlag} onUnlink={() => setLink(it, null)} />)}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </CardContent>
            )}
          </Card>
          </div>
        );
      })}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Unassigned</CardTitle>
          <p className="text-xs text-muted-foreground">Not in a campaign yet. Use "Link existing" on a campaign to sort these.</p>
        </CardHeader>
        <CardContent>
          {unassigned.filter((it) => it.kind !== "collab").length === 0 ? (
            <p className="text-xs text-muted-foreground">Everything is assigned.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {unassigned.filter((it) => it.kind !== "collab").map((it) => <ItemRow key={`${it.kind}-${it.id}`} it={it} onFlag={setFlag} showKind />)}
            </ul>
          )}
        </CardContent>
        <CardContent className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Unassigned collab briefs and lead submissions</h3>
          <BriefsManager key={unassigned.filter((i) => i.kind === "collab").map((i) => i.id).join(",")} campaignId={null} onChanged={refresh} />
        </CardContent>
      </Card>
    </div>
  );
}

function ItemRow({
  it,
  onFlag,
  onUnlink,
  showKind,
}: {
  it: Item;
  onFlag: (it: Item, f: "published" | "dashboard_visible", v: boolean) => void;
  onUnlink?: () => void;
  showKind?: boolean;
}) {
  const live = liveHref(it);
  const edit = editHref(it);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
      {showKind && <Badge variant="secondary">{KIND_LABEL[it.kind]}</Badge>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link {...(edit as any)} className="font-medium hover:underline">{it.title}</Link>
      {live && <a href={live} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">View live</a>}
      <div className="ml-auto flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs">
          <Switch checked={it.published} onCheckedChange={(v) => onFlag(it, "published", v)} />
          {it.kind === "collab" ? "Opportunity" : "Published"}
        </label>
        {it.kind === "page" && (
          <label className="flex items-center gap-1.5 text-xs">
            <Switch checked={!!it.dashboard} onCheckedChange={(v) => onFlag(it, "dashboard_visible", v)} />
            All dashboards
          </label>
        )}
        {onUnlink && (
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Unlink from campaign" onClick={onUnlink}>
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}
