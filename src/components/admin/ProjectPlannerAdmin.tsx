import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ExternalLink, GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminSearchProfiles } from "@/lib/admin-users.functions";
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

type LinkedUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  slug: string | null;
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
  sort_order: number;
  linked_users: LinkedUser[] | null;
};

/**
 * Pick a sort_order that places a task between two neighbours.
 * Uses fractional midpoints so only the moved row needs a DB write.
 */
function orderBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 0;
  if (prev === null) return (next as number) - 1;
  if (next === null) return prev + 1;
  return (prev + next) / 2;
}

/**
 * Due-date colouring for the admin task list.
 *  - Within 24h (or overdue by up to 24h) → brand green.
 *  - Within 24–48h                    → brand pink.
 *  - Otherwise                        → muted (no highlight).
 */
function dueBucket(dueDate: string | null): "green" | "pink" | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (due >= now - day && due <= now + day) return "green";
  if (due > now + day && due <= now + 2 * day) return "pink";
  return null;
}

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

/** Small avatar + name chip; clicks through to the public profile when one exists. */
function LinkedUserChip({ user }: { user: LinkedUser }) {
  const inner = (
    <>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="size-4 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="grid size-4 place-items-center rounded-full bg-muted text-[9px] font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-[140px] truncate">{user.name}</span>
    </>
  );
  const cls = "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-[11px]";
  return user.slug ? (
    <a href={`/u/${user.slug}`} target="_blank" rel="noreferrer" className={`${cls} hover:border-primary`}>
      {inner}
    </a>
  ) : (
    <span className={`${cls} text-muted-foreground`}>{inner}</span>
  );
}

/** Admin-only search to attach people to a task. */
function LinkedUsersPicker({
  value,
  onChange,
}: {
  value: LinkedUser[];
  onChange: (next: LinkedUser[]) => void;
}) {
  const search = useServerFn(adminSearchProfiles);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LinkedUser[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res: any = await search({ data: { q: term } });
        if (!cancelled) setResults((res?.results ?? []) as LinkedUser[]);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, search]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((u) => (
          <span key={u.id} className="inline-flex items-center gap-1">
            <LinkedUserChip user={u} />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange(value.filter((x) => x.id !== u.id))}
              aria-label={`Remove ${u.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Input placeholder="Link a user (search by name)" value={q} onChange={(e) => setQ(e.target.value)} />
      {busy ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {results.length > 0 ? (
        <div className="max-h-44 space-y-1 overflow-auto rounded-md border border-border/60 p-1">
          {results
            .filter((r) => !value.some((v) => v.id === r.id))
            .map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onChange([...value, r]);
                  setQ("");
                  setResults([]);
                }}
              >
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="size-5 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px]">
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate">{r.name}</span>
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
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
  const [editUsers, setEditUsers] = useState<LinkedUser[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

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
        .select("id, title, notes, status, due_date, link_url, related_label, created_at, sort_order, linked_users")
        .order("sort_order", { ascending: true })
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
    const dueDate = prefill ? null : taskDue || null;

    // Auto-place by due date: slot the task in with other dated tasks,
    // earliest first; undated tasks sit after dated ones. No date → top.
    const open = tasks.filter((t) => t.status !== "done");
    let insertIdx = 0;
    if (dueDate) {
      insertIdx = open.length;
      for (let i = 0; i < open.length; i++) {
        const other = open[i].due_date;
        if (!other || other > dueDate) {
          insertIdx = i;
          break;
        }
      }
    }
    const prevOrder = insertIdx > 0 ? (open[insertIdx - 1].sort_order ?? 0) : null;
    const nextOrder = insertIdx < open.length ? (open[insertIdx].sort_order ?? 0) : null;

    const { data, error } = await (supabase as any)
      .from("admin_tasks")
      .insert({
        user_id: userId,
        title,
        notes: prefill ? null : taskNotes.trim() || null,
        due_date: dueDate,
        link_url: prefill?.link ?? (taskLink.trim() || null),
        related_label: prefill?.label ?? null,
        linked_users: [],
        sort_order: orderBetween(prevOrder, nextOrder),
      })
      .select("id, title, notes, status, due_date, link_url, related_label, created_at, sort_order, linked_users")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Couldn't add that task");
      return;
    }
    setTasks((t) =>
      [...t, data as TaskRow].sort(
        (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.created_at.localeCompare(y.created_at),
      ),
    );
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
    setEditUsers(task.linked_users ?? []);
  }

  async function saveEdit(id: string) {
    const title = editTitle.trim();
    if (!title) return;
    const patch = {
      title,
      notes: editNotes.trim() || null,
      due_date: editDue || null,
      link_url: editLink.trim() || null,
      linked_users: editUsers,
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

  async function moveTask(task: TaskRow, dir: -1 | 1) {
    // Re-order within the open tasks list.
    const list = [...openTasks];
    const idx = list.findIndex((t) => t.id === task.id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;
    const a = list[idx];
    const b = list[swapWith];
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    // Swap sort_order values, then re-sort the array so the UI updates immediately.
    setTasks((t) => {
      const swapped = t.map((x) =>
        x.id === a.id ? { ...x, sort_order: bOrder } : x.id === b.id ? { ...x, sort_order: aOrder } : x,
      );
      return [...swapped].sort(
        (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.created_at.localeCompare(y.created_at),
      );
    });
    const [r1, r2] = await Promise.all([
      (supabase as any).from("admin_tasks").update({ sort_order: bOrder }).eq("id", a.id),
      (supabase as any).from("admin_tasks").update({ sort_order: aOrder }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) toast.error("Couldn't save the new order");
  }

  /** Drop `dragId` so it sits at position `targetIdx` within the open list. */
  async function dropTaskAt(dragId: string, targetIdx: number) {
    const list = tasks.filter((t) => t.status !== "done");
    const from = list.findIndex((t) => t.id === dragId);
    if (from < 0) return;
    let to = targetIdx;
    if (from < to) to -= 1; // account for removing the dragged item first
    if (from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const prevOrder = to > 0 ? (list[to - 1].sort_order ?? 0) : null;
    const nextOrder = to < list.length - 1 ? (list[to + 1].sort_order ?? 0) : null;
    const newOrder = orderBetween(prevOrder, nextOrder);
    setTasks((t) => {
      const updated = t.map((x) => (x.id === dragId ? { ...x, sort_order: newOrder } : x));
      return [...updated].sort(
        (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.created_at.localeCompare(y.created_at),
      );
    });
    const { error } = await (supabase as any).from("admin_tasks").update({ sort_order: newOrder }).eq("id", dragId);
    if (error) toast.error("Couldn't save the new order");
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
              openTasks.map((t, idx) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(t.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropIdx(idx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) void dropTaskAt(dragId, idx);
                    setDragId(null);
                    setDropIdx(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropIdx(null);
                  }}
                  className={`flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors ${
                    dragId === t.id
                      ? "border-dashed border-primary/60 opacity-50"
                      : dropIdx === idx && dragId
                        ? "border-primary"
                        : "border-border/60"
                  }`}
                >
                  <span
                    className="mt-1 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <Button size="icon" variant="outline" className="size-7 shrink-0" onClick={() => void toggleTask(t)}>
                    <Check className="size-3.5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <div className="space-y-2">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Task" />
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          placeholder="Notes"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                          <Input
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            placeholder="Link (optional)"
                          />
                        </div>
                        <LinkedUsersPicker value={editUsers} onChange={setEditUsers} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void saveEdit(t.id)} disabled={!editTitle.trim()}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.notes ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.notes}</p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {t.due_date ? (
                            <span
                              className={
                                dueBucket(t.due_date) === "green"
                                  ? "font-medium text-primary"
                                  : dueBucket(t.due_date) === "pink"
                                    ? "font-medium text-pink-accent"
                                    : ""
                              }
                            >
                              Due {fmt(t.due_date)}
                            </span>
                          ) : null}
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
                        {t.linked_users && t.linked_users.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {t.linked_users.map((u) => (
                              <LinkedUserChip key={u.id} user={u} />
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5 text-muted-foreground/60"
                      disabled={idx === 0}
                      onClick={() => void moveTask(t, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5 text-muted-foreground/60"
                      disabled={idx === openTasks.length - 1}
                      onClick={() => void moveTask(t, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>
                  {editingId === t.id ? null : (
                    <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => startEdit(t)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
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
