import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getAuthUserId } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlannerKind = "Brief page" | "Campaign brief" | "Roster" | "Report" | "Listening report";

type PlannerItem = {
  id: string;
  kind: PlannerKind;
  title: string;
  subtitle?: string | null;
  published: boolean;
  href?: string | null;
  editHref?: string | null;
  updatedAt?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  due_date: string | null;
  link_url: string | null;
  related_label: string | null;
  created_at: string;
};

const KINDS: Array<PlannerKind | "All"> = [
  "All",
  "Brief page",
  "Campaign brief",
  "Roster",
  "Report",
  "Listening report",
];

function fmt(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** Admin-only: everything feeding the users' Project planner, plus a private task list. */
export function ProjectPlannerAdmin() {
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("All");
  const [search, setSearch] = useState("");

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editLink, setEditLink] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [pages, briefs, rosters, reports, scans] = await Promise.all([
        (supabase as any)
          .from("partner_pages")
          .select("id, slug, headline, subtitle, section, dashboard_placement, dashboard_visible, published, archived, updated_at")
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("campaign_briefs")
          .select("id, title, status, published, created_at")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("rosters")
          .select("id, title, slug, published, updated_at")
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("campaign_reports")
          .select("id, title, slug, published, updated_at")
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("social_listening_scans")
          .select("id, report_title, artist_name, dashboard_visible, saved, updated_at")
          .eq("saved", true)
          .order("updated_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const rows: PlannerItem[] = [];

      ((pages?.data ?? []) as any[])
        .filter((p) => (p.section ?? "spotlight") === "brief" && !p.archived)
        .filter((p) => (p.dashboard_placement ?? "planner") !== "spotlight")
        .forEach((p) =>
          rows.push({
            id: p.id,
            kind: "Brief page",
            title: p.headline ?? "Untitled brief",
            subtitle: p.subtitle ?? null,
            published: !!p.published && !!p.dashboard_visible,
            href: p.slug ? `/brief/${p.slug}` : null,
            editHref: `/briefs?edit=${p.id}`,
            updatedAt: p.updated_at,
          }),
        );

      ((briefs?.data ?? []) as any[])
        .filter((b) => b.status !== "closed")
        .forEach((b) =>
          rows.push({
            id: b.id,
            kind: "Campaign brief",
            title: b.title ?? "Untitled",
            subtitle: b.status ?? null,
            published: !!b.published,
            editHref: `/campaign-builder`,
            updatedAt: b.created_at,
          }),
        );

      ((rosters?.data ?? []) as any[]).forEach((r) =>
        rows.push({
          id: r.id,
          kind: "Roster",
          title: r.title ?? "Untitled roster",
          published: !!r.published,
          href: r.slug ? `/roster/${r.slug}` : null,
          editHref: `/roster-builder?edit=${r.id}`,
          updatedAt: r.updated_at,
        }),
      );

      ((reports?.data ?? []) as any[]).forEach((r) =>
        rows.push({
          id: r.id,
          kind: "Report",
          title: r.title ?? "Untitled report",
          published: !!r.published,
          href: r.slug ? `/report/${r.slug}` : null,
          editHref: `/campaign-reports?edit=${r.id}`,
          updatedAt: r.updated_at,
        }),
      );

      ((scans?.data ?? []) as any[]).forEach((s) =>
        rows.push({
          id: s.id,
          kind: "Listening report",
          title: s.report_title || s.artist_name || "Listening report",
          subtitle: s.artist_name ?? null,
          published: !!s.dashboard_visible,
          href: `/listening-report/${s.id}`,
          editHref: `/racket-desk/reports`,
          updatedAt: s.updated_at,
        }),
      );

      setItems(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("admin_tasks")
        .select("id, title, notes, status, due_date, link_url, related_label, created_at")
        .order("created_at", { ascending: false });
      setTasks(((data as TaskRow[]) ?? []));
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => kind === "All" || i.kind === kind)
      .filter((i) => !q || i.title.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q));
  }, [items, kind, search]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((i) => map.set(i.kind, (map.get(i.kind) ?? 0) + 1));
    return map;
  }, [items]);

  async function addTask(prefill?: { title: string; link?: string | null; label?: string | null }) {
    const title = prefill?.title ?? taskTitle.trim();
    if (!title) return;
    setSaving(true);
    const userId = await getAuthUserId();
    if (!userId) {
      setSaving(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("admin_tasks")
      .insert({
        user_id: userId,
        title,
        notes: prefill ? null : taskNotes.trim() || null,
        due_date: prefill ? null : taskDue || null,
        link_url: prefill?.link ?? (taskLink.trim() || null),
        related_label: prefill?.label ?? null,
      })
      .select("id, title, notes, status, due_date, link_url, related_label, created_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Couldn't add that task");
      return;
    }
    setTasks((t) => [data as TaskRow, ...t]);
    if (!prefill) {
      setTaskTitle("");
      setTaskNotes("");
      setTaskDue("");
      setTaskLink("");
    }
    toast.success("Task added");
  }

  function startEdit(task: TaskRow) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditNotes(task.notes ?? "");
    setEditDue(task.due_date ?? "");
    setEditLink(task.link_url ?? "");
  }

  async function saveEdit(id: string) {
    const title = editTitle.trim();
    if (!title) return;
    const patch = {
      title,
      notes: editNotes.trim() || null,
      due_date: editDue || null,
      link_url: editLink.trim() || null,
    };
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setEditingId(null);
    const { error } = await (supabase as any).from("admin_tasks").update(patch).eq("id", id);
    if (error) toast.error("Couldn't save that task");
  }

  async function toggleTask(task: TaskRow) {
    const next = task.status === "done" ? "todo" : "done";
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status: next } : x)));
    const { error } = await (supabase as any).from("admin_tasks").update({ status: next }).eq("id", task.id);
    if (error) toast.error("Couldn't update that task");
  }

  async function removeTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    const { error } = await (supabase as any).from("admin_tasks").delete().eq("id", id);
    if (error) toast.error("Couldn't delete that task");
  }

  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My tasks</CardTitle>
          <p className="text-sm text-muted-foreground">
            Private to you — nobody else can see these.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <Input
              placeholder="What needs doing?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addTask();
              }}
            />
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            <Button onClick={() => void addTask()} disabled={saving || !taskTitle.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Textarea
              placeholder="Notes (optional)"
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              rows={2}
            />
            <Input
              placeholder="Link (optional)"
              value={taskLink}
              onChange={(e) => setTaskLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks.</p>
            ) : (
              openTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <Button size="icon" variant="outline" className="size-7 shrink-0" onClick={() => void toggleTask(t)}>
                    <Check className="size-3.5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.notes ? <p className="mt-1 text-xs text-muted-foreground">{t.notes}</p> : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.due_date ? <span>Due {fmt(t.due_date)}</span> : null}
                      {t.related_label ? <Badge variant="secondary">{t.related_label}</Badge> : null}
                      {t.link_url ? (
                        <a
                          href={t.link_url}
                          className="inline-flex items-center gap-1 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => void removeTask(t.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {doneTasks.length > 0 ? (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowDone((v) => !v)}>
                {showDone ? "Hide" : "Show"} done ({doneTasks.length})
              </Button>
              {showDone ? (
                <div className="mt-2 space-y-2">
                  {doneTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-border/40 p-3 text-sm text-muted-foreground"
                    >
                      <Button size="icon" variant="outline" className="size-7 shrink-0" onClick={() => void toggleTask(t)}>
                        <Check className="size-3.5 text-primary" />
                      </Button>
                      <span className="line-through">{t.title}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto size-7 shrink-0"
                        onClick={() => void removeTask(t.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Everything in Project planners</CardTitle>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${items.length} items — ${KINDS.slice(1)
                  .map((k) => `${counts.get(k) ?? 0} ${k.toLowerCase()}`)
                  .join(", ")}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px]"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing matches.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((i) => (
                <div
                  key={`${i.kind}:${i.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <Badge variant="outline">{i.kind}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.subtitle ? `${i.subtitle} · ` : ""}
                      {i.updatedAt ? `Updated ${fmt(i.updatedAt)}` : ""}
                    </p>
                  </div>
                  <Badge variant={i.published ? "default" : "secondary"}>
                    {i.published ? "Live" : "Draft"}
                  </Badge>
                  {i.href ? (
                    <Button asChild size="sm" variant="ghost">
                      <a href={i.href} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </Button>
                  ) : null}
                  {i.editHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={i.editHref}>Edit</a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void addTask({ title: i.title, link: i.href ?? null, label: i.kind })}
                  >
                    <Plus className="size-3.5" /> Task
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectPlannerAdmin;
