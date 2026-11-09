import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, ExternalLink, Save, Trash2, Upload, Plus } from "lucide-react";
import { reportCalendarPlatforms } from "@/lib/report-calendar-platforms";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { calendarEventKey, findCalendarEvent, normalizeDraftLink, sortDraftsForReview, DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_URL_TTL_SECONDS } from "@/lib/report-review";

type CalEvent = { date?: string | null; time?: string | null; label?: string | null; platforms?: string[] | null };
type Comment = { id: string; author_name: string | null; body: string; created_at: string; resolved: boolean };
type Draft = {
  id: string; calendar_event_key: string | null; media_url: string | null; media_path: string | null; thumbnail_path: string | null; link_url: string | null; platforms: string[] | null; media_type: string; caption: string; hide_banner: boolean; archived: boolean;
  published: boolean; approval_status: string; approved_at: string | null; approved_by_name: string | null; position: number;
  report_draft_comments: Comment[];
};

const sb = supabase as any;

export function ReportDraftSettings({ reportId, slug, events }: { reportId: string; slug?: string; events: CalEvent[] | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // Admin-only previews of privately stored uploads (path -> short-lived link).
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Unsaved text edits per draft, kept until the admin saves.
  const [edits, setEdits] = useState<Record<string, { caption?: string; link?: string }>>({});
  const setEdit = (id: string, patch: { caption?: string; link?: string }) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const clearEdit = (id: string, key: "caption" | "link") => setEdits((e) => { const n = { ...e[id] }; delete n[key]; return { ...e, [id]: n }; });
  const hasUnsaved = Object.values(edits).some((e) => e && Object.keys(e).length > 0);
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);
  async function saveCaption(d: Draft) {
    const v = edits[d.id]?.caption;
    if (v === undefined || v === d.caption) return clearEdit(d.id, "caption");
    if (await update(d.id, { caption: v }, "Caption saved")) clearEdit(d.id, "caption");
  }
  async function saveLink(d: Draft) {
    const raw = (edits[d.id]?.link ?? d.link_url ?? "").trim();
    const next = normalizeDraftLink(raw);
    if (raw && !next) return void toast.error("Add a full web link, e.g. https://…");
    if (next === (d.link_url ?? null)) return clearEdit(d.id, "link");
    if (await update(d.id, { link_url: next }, next ? "Link saved" : "Link removed")) clearEdit(d.id, "link");
  }

  async function load() {
    const { data, error } = await sb
      .from("report_draft_posts")
      .select("id, calendar_event_key, media_url, media_path, thumbnail_path, link_url, platforms, media_type, caption, hide_banner, archived, published, approval_status, approved_at, approved_by_name, position, report_draft_comments(id, author_name, body, created_at, resolved)")
      .eq("report_id", reportId)
      .order("position").order("created_at");
    if (error) toast.error("Could not load drafts");
    setDrafts(data ?? []);
    setLoading(false);
    void signPreviews(((data ?? []) as Draft[]).flatMap((d) => [d.media_path, d.thumbnail_path]).filter((p): p is string => !!p));
  }
  async function signPreviews(paths: string[]) {
    if (!paths.length) return;
    const { data } = await supabase.storage.from(DRAFT_MEDIA_BUCKET).createSignedUrls(paths, DRAFT_MEDIA_URL_TTL_SECONDS);
    const next: Record<string, string> = {};
    for (const u of data ?? []) if (u.path && u.signedUrl) next[u.path] = u.signedUrl;
    setPreviews((p) => ({ ...p, ...next }));
  }
  useEffect(() => { void load(); }, [reportId]);

  async function update(id: string, patch: Partial<Draft>, msg?: string) {
    setBusy(id);
    const { error } = await sb.from("report_draft_posts").update(patch).eq("id", id);
    setBusy(null);
    if (error) { toast.error("Could not save draft"); return false; }
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    if (msg) toast.success(msg);
    return true;
  }
  async function add() {
    const position = drafts.length ? Math.min(...drafts.map((d) => d.position)) - 1 : 0;
    const { error } = await sb.from("report_draft_posts").insert({ report_id: reportId, position });
    if (error) return toast.error("Could not add draft");
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this draft and its comments?")) return;
    const target = drafts.find((d) => d.id === id);
    const paths = [target?.media_path, target?.thumbnail_path].filter((p): p is string => !!p);
    const { error } = await sb.from("report_draft_posts").delete().eq("id", id);
    if (error) return toast.error("Could not delete draft");
    if (paths.length) void supabase.storage.from(DRAFT_MEDIA_BUCKET).remove(paths);
    setDrafts((ds) => ds.filter((d) => d.id !== id));
  }
  async function upload(d: Draft, file: File) {
    setBusy(d.id);
    try {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `${reportId}/${d.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(DRAFT_MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const old = d.media_path;
      await update(d.id, { media_path: path, media_url: null, media_type: isVideo ? "video" : "image" }, "Media uploaded");
      await signPreviews([path]);
      if (old) void supabase.storage.from(DRAFT_MEDIA_BUCKET).remove([old]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function uploadThumbnail(d: Draft, file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Thumbnail must be an image");
    setBusy(d.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${reportId}/${d.id}-thumb-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(DRAFT_MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const old = d.thumbnail_path;
      await update(d.id, { thumbnail_path: path }, "Thumbnail uploaded");
      await signPreviews([path]);
      if (old) void supabase.storage.from(DRAFT_MEDIA_BUCKET).remove([old]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function removeThumbnail(d: Draft) {
    const old = d.thumbnail_path;
    if (!old) return;
    if (await update(d.id, { thumbnail_path: null }, "Thumbnail removed")) void supabase.storage.from(DRAFT_MEDIA_BUCKET).remove([old]);
  }
  async function resolveComment(draftId: string, c: Comment) {
    const { error } = await sb.from("report_draft_comments").update({ resolved: !c.resolved }).eq("id", c.id);
    if (error) return toast.error("Could not update comment");
    setDrafts((ds) => ds.map((d) => d.id === draftId ? { ...d, report_draft_comments: d.report_draft_comments.map((x) => x.id === c.id ? { ...x, resolved: !c.resolved } : x) } : d));
  }
  async function deleteComment(draftId: string, id: string) {
    const { error } = await sb.from("report_draft_comments").delete().eq("id", id);
    if (error) return toast.error("Could not delete comment");
    setDrafts((ds) => ds.map((d) => d.id === draftId ? { ...d, report_draft_comments: d.report_draft_comments.filter((x) => x.id !== id) } : d));
  }

  const eventOptions = (events ?? []).filter((e) => e.date || e.label);
  const statusLabel = (s: string) => (s === "approved" ? "Approved" : s === "amends" ? "Amends needed" : "Pending");

  const activeDrafts = sortDraftsForReview(drafts.filter((d) => !d.archived));
  const archivedDrafts = sortDraftsForReview(drafts.filter((d) => d.archived));
  const renderDraft = (d: Draft) => {
            const ev = findCalendarEvent(events ?? [], d.calendar_event_key);
            return (
              <div key={d.id} className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-[140px_1fr]">
                <div className="space-y-2">
                  <div className="aspect-[9/16] overflow-hidden rounded-md bg-muted">
                    {(() => {
                      const src = d.media_path ? previews[d.media_path] : d.media_url;
                      const poster = d.thumbnail_path ? previews[d.thumbnail_path] : undefined;
                      if (src) return d.media_type === "video" ? <video src={src} poster={poster} muted className="h-full w-full object-cover" /> : <img src={src} alt="" className="h-full w-full object-cover" />;
                      if (d.link_url) return <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground"><ExternalLink className="mr-1 size-3" /> Linked content</div>;
                      return null;
                    })()}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-purple-soft hover:underline">
                    <Upload className="size-3" /> {d.media_path || d.media_url ? "Replace media" : "Upload photo/video"}
                    <input type="file" accept="image/*,video/*" className="hidden" disabled={busy === d.id}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(d, f); e.target.value = ""; }} />
                  </label>
                  {d.media_type === "video" && d.media_path && (
                    <div className="flex flex-col gap-1">
                      <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-purple-soft hover:underline">
                        <Upload className="size-3" /> {d.thumbnail_path ? "Replace thumbnail" : "Upload thumbnail"}
                        <input type="file" accept="image/*" className="hidden" disabled={busy === d.id}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumbnail(d, f); e.target.value = ""; }} />
                      </label>
                      {d.thumbnail_path && (
                        <button type="button" className="self-start text-xs text-muted-foreground hover:underline" onClick={() => void removeThumbnail(d)}>Remove thumbnail</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{statusLabel(d.approval_status)}{d.approved_by_name ? ` · ${d.approved_by_name}` : ""}</span>
                    <div className="flex items-center gap-3">
                      <Label className="flex items-center gap-2 text-sm">
                        <Switch checked={d.published} onCheckedChange={(c) => update(d.id, { published: c }, c ? "Showing on Review tab" : "Hidden from Review tab")} />
                        Show on Review tab
                      </Label>
                      <Label className="flex items-center gap-2 text-sm">
                        <Switch checked={!d.hide_banner} onCheckedChange={(c) => update(d.id, { hide_banner: !c }, c ? "Draft banner shown" : "Draft banner hidden")} />
                        Draft banner
                      </Label>
                      <Button type="button" variant="ghost" size="icon" aria-label={d.archived ? "Restore draft" : "Archive draft"} title={d.archived ? "Restore" : "Archive"} onClick={() => update(d.id, { archived: !d.archived }, d.archived ? "Draft restored" : "Draft archived — hidden from Review tab")}>{d.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}</Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Delete draft" onClick={() => remove(d.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link to calendar entry</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={d.calendar_event_key ?? ""}
                      onChange={(e) => update(d.id, { calendar_event_key: e.target.value || null }, "Calendar link saved")}
                    >
                      <option value="">Not linked</option>
                      {eventOptions.map((e) => { const k = calendarEventKey(e); return <option key={k} value={k}>{[e.date, e.time, e.label].filter(Boolean).join(" · ")}</option>; })}
                      {d.calendar_event_key && !ev && <option value={d.calendar_event_key}>Missing entry (edited or removed)</option>}
                    </select>
                    {ev?.platforms?.length ? <p className="text-xs text-muted-foreground">Calendar tags: {ev.platforms.join(" · ")}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Content link (optional, instead of or as well as an upload)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={edits[d.id]?.link ?? d.link_url ?? ""}
                        placeholder="https://dropbox.com/…"
                        onChange={(e) => setEdit(d.id, { link: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") void saveLink(d); }}
                      />
                      <Button type="button" variant="purple" size="sm" disabled={busy === d.id || edits[d.id]?.link === undefined} onClick={() => saveLink(d)}>
                        <Save className="size-4" /> {edits[d.id]?.link === undefined ? "Saved" : "Save"}
                      </Button>
                      {d.link_url && (
                        <Button asChild variant="outline" size="icon" aria-label="Open content link">
                          <a href={d.link_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Platform tags{ev ? " (leave all off to use the calendar entry's tags)" : ""}</Label>
                    <div className="flex flex-wrap items-center gap-4">
                      {[...reportCalendarPlatforms(), ...(slug === "tixel-brand-ads" ? ["Organic usage"] : [])].map((p) => {
                        const cur = d.platforms ?? [];
                        return (
                          <label key={p} className="flex items-center gap-1.5 text-xs font-medium">
                            <Switch
                              className={p === "TBC" ? "data-[state=checked]:bg-purple" : undefined}
                              checked={cur.includes(p)}
                              disabled={busy === d.id}
                              onCheckedChange={(c) => update(d.id, { platforms: c ? [...cur, p] : cur.filter((x) => x !== p) }, `${p} ${c ? "on" : "off"} — saved`)}
                            />
                            {p}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Draft caption</Label>
                    <Textarea
                      value={edits[d.id]?.caption ?? d.caption}
                      onChange={(e) => setEdit(d.id, { caption: e.target.value })}
                    />
                    <div className="flex items-center justify-end gap-2">
                      {edits[d.id]?.caption !== undefined && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                      <Button type="button" variant="purple" size="sm" disabled={busy === d.id || edits[d.id]?.caption === undefined} onClick={() => saveCaption(d)}>
                        <Save className="size-4" /> {edits[d.id]?.caption === undefined ? "Saved" : "Save caption"}
                      </Button>
                    </div>
                  </div>
                  {d.report_draft_comments.length > 0 && (
                    <ul className="space-y-2 border-t border-border pt-3">
                      {d.report_draft_comments.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((c) => (
                        <li key={c.id} className={`text-sm ${c.resolved ? "opacity-50" : ""}`}>
                          <span className="font-medium">{c.author_name || "Reviewer"}</span>
                          <span className="text-muted-foreground"> · {new Date(c.created_at).toLocaleString("en-AU")}</span>
                          <p className="whitespace-pre-wrap">{c.body}</p>
                          <div className="flex gap-3 text-xs">
                            <button type="button" className="text-purple-soft hover:underline" onClick={() => resolveComment(d.id, c)}>{c.resolved ? "Reopen" : "Mark resolved"}</button>
                            <button type="button" className="text-muted-foreground hover:underline" onClick={() => deleteComment(d.id, c.id)}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div>
          <CardTitle className="font-display text-2xl">Draft content</CardTitle>
          <CardDescription>Drafts for client review on the live Review tab. Uploads stay private and only show on the Review tab; or paste a link to the content instead.</CardDescription>
        </div>
        {open ? <ChevronDown className="size-5 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <Button type="button" variant="outline" onClick={add}><Plus className="size-4" /> Add draft</Button>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : !drafts.length ? <p className="text-sm text-muted-foreground">No drafts yet.</p> : (
            <>
              {activeDrafts.length ? activeDrafts.map(renderDraft) : <p className="text-sm text-muted-foreground">No active drafts.</p>}
              {archivedDrafts.length > 0 && (
                <div className="rounded-lg border border-dashed border-border">
                  <button type="button" onClick={() => setShowArchived((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
                    {showArchived ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} Archive ({archivedDrafts.length})
                  </button>
                  {showArchived && <div className="space-y-4 px-4 pb-4">{archivedDrafts.map(renderDraft)}</div>}
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
