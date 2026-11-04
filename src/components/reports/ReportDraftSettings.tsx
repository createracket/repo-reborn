import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Trash2, Upload, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { calendarEventKey, findCalendarEvent } from "@/lib/report-review";

type CalEvent = { date?: string | null; time?: string | null; label?: string | null; platforms?: string[] | null };
type Comment = { id: string; author_name: string | null; body: string; created_at: string; resolved: boolean };
type Draft = {
  id: string; calendar_event_key: string | null; media_url: string | null; media_type: string; caption: string;
  published: boolean; approval_status: string; approved_at: string | null; approved_by_name: string | null; position: number;
  report_draft_comments: Comment[];
};

const sb = supabase as any;

export function ReportDraftSettings({ reportId, events }: { reportId: string; events: CalEvent[] | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data, error } = await sb
      .from("report_draft_posts")
      .select("id, calendar_event_key, media_url, media_type, caption, published, approval_status, approved_at, approved_by_name, position, report_draft_comments(id, author_name, body, created_at, resolved)")
      .eq("report_id", reportId)
      .order("position").order("created_at");
    if (error) toast.error("Could not load drafts");
    setDrafts(data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [reportId]);

  async function update(id: string, patch: Partial<Draft>, msg?: string) {
    setBusy(id);
    const { error } = await sb.from("report_draft_posts").update(patch).eq("id", id);
    setBusy(null);
    if (error) return toast.error("Could not save draft");
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    if (msg) toast.success(msg);
  }
  async function add() {
    const position = drafts.length ? Math.min(...drafts.map((d) => d.position)) - 1 : 0;
    const { error } = await sb.from("report_draft_posts").insert({ report_id: reportId, position });
    if (error) return toast.error("Could not add draft");
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this draft and its comments?")) return;
    const { error } = await sb.from("report_draft_posts").delete().eq("id", id);
    if (error) return toast.error("Could not delete draft");
    setDrafts((ds) => ds.filter((d) => d.id !== id));
  }
  async function upload(d: Draft, file: File) {
    setBusy(d.id);
    try {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `report-drafts/${reportId}/${d.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("spotlight-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const url = supabase.storage.from("spotlight-images").getPublicUrl(path).data.publicUrl;
      await update(d.id, { media_url: url, media_type: isVideo ? "video" : "image" }, "Media uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div>
          <CardTitle className="font-display text-2xl">Draft content</CardTitle>
          <CardDescription>Drafts for client review on the live Review tab. Link each to a calendar entry to pull through its platform tags.</CardDescription>
        </div>
        {open ? <ChevronDown className="size-5 text-muted-foreground" /> : <ChevronRight className="size-5 text-muted-foreground" />}
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <Button type="button" variant="outline" onClick={add}><Plus className="size-4" /> Add draft</Button>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : !drafts.length ? <p className="text-sm text-muted-foreground">No drafts yet.</p> : drafts.map((d) => {
            const ev = findCalendarEvent(events ?? [], d.calendar_event_key);
            return (
              <div key={d.id} className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-[140px_1fr]">
                <div className="space-y-2">
                  <div className="aspect-[9/16] overflow-hidden rounded-md bg-muted">
                    {d.media_url && (d.media_type === "video" ? <video src={d.media_url} muted className="h-full w-full object-cover" /> : <img src={d.media_url} alt="" className="h-full w-full object-cover" />)}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-purple-soft hover:underline">
                    <Upload className="size-3" /> {d.media_url ? "Replace media" : "Upload photo/video"}
                    <input type="file" accept="image/*,video/*" className="hidden" disabled={busy === d.id}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(d, f); e.target.value = ""; }} />
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{statusLabel(d.approval_status)}{d.approved_by_name ? ` · ${d.approved_by_name}` : ""}</span>
                    <div className="flex items-center gap-3">
                      <Label className="flex items-center gap-2 text-sm">
                        <Switch checked={d.published} onCheckedChange={(c) => update(d.id, { published: c }, c ? "Showing on Review tab" : "Hidden from Review tab")} />
                        Show on Review tab
                      </Label>
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
                    {ev?.platforms?.length ? <p className="text-xs text-muted-foreground">Tags: {ev.platforms.join(" · ")}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Draft caption</Label>
                    <Textarea
                      defaultValue={d.caption}
                      onBlur={(e) => { if (e.target.value !== d.caption) void update(d.id, { caption: e.target.value }, "Caption saved"); }}
                    />
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
          })}
        </CardContent>
      )}
    </Card>
  );
}
