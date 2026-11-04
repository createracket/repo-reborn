import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findCalendarEvent } from "@/lib/report-review";
import { submitDraftComment, setDraftApproval } from "@/lib/report-review.functions";

type Comment = { id: string; author_name: string | null; body: string; created_at: string };
type Draft = {
  id: string; calendar_event_key: string | null; platform: string | null; media_url: string | null; media_type: string;
  caption: string; approval_status: string; approved_at: string | null; approved_by_name: string | null; comments: Comment[];
};
type CalEvent = { date?: string | null; time?: string | null; timezone?: string | null; label?: string | null; platforms?: string[] | null };

export function ReportReviewSection({ slug, events, refreshTick }: { slug: string; events: CalEvent[]; refreshTick: number }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_report_review_drafts", { _slug: slug }).then(({ data, error }) => {
      if (cancelled) return;
      setError(!!error);
      setDrafts(((data as unknown) as Draft[]) ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug, refreshTick, tick]);
  if (loading) return <p className="mt-8 text-sm text-muted-foreground">Loading drafts…</p>;
  if (error) return <p role="alert" className="mt-8 text-sm text-destructive">Drafts could not be loaded.</p>;
  if (!drafts.length) return <p className="mt-8 text-sm text-muted-foreground">No drafts to review right now.</p>;
  return (
    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {drafts.map((d) => <DraftCard key={d.id} draft={d} event={findCalendarEvent(events, d.calendar_event_key)} onChanged={() => setTick((t) => t + 1)} />)}
    </section>
  );
}

function DraftCard({ draft, event, onChanged }: { draft: Draft; event: CalEvent | null; onChanged: () => void }) {
  const comment = useServerFn(submitDraftComment);
  const approve = useServerFn(setDraftApproval);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [showAmends, setShowAmends] = useState(false);
  const [busy, setBusy] = useState(false);
  const tags = event?.platforms?.length ? event.platforms : draft.platform ? [draft.platform] : [];
  const approved = draft.approval_status === "approved";
  const when = event?.date
    ? `${new Date(`${event.date}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}${event.time ? ` · ${event.time} ${event.timezone ?? "AEDT"}` : ""}`
    : null;

  async function toggleApprove() {
    setBusy(true);
    try { await approve({ data: { draftId: draft.id, name, approved: !approved } }); toast.success(approved ? "Approval removed" : "Approved — thanks!"); onChanged(); }
    catch { toast.error("Could not save approval"); }
    finally { setBusy(false); }
  }
  async function sendComment() {
    if (!body.trim()) return;
    setBusy(true);
    try { await comment({ data: { draftId: draft.id, name, body } }); setBody(""); setShowAmends(false); toast.success("Comment sent"); onChanged(); }
    catch (e) { toast.error((e as Error).message || "Could not send comment"); }
    finally { setBusy(false); }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card">
      <div className="relative m-3 aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        {draft.media_url && (draft.media_type === "video"
          ? <video src={draft.media_url} controls playsInline className="h-full w-full object-cover" />
          : <img src={draft.media_url} alt={draft.caption.slice(0, 80) || "Draft content"} loading="lazy" className="h-full w-full object-cover" />)}
        <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-muted-foreground/50 py-1 text-center text-xs font-semibold uppercase tracking-wider text-background">Draft</div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t === "TBC" ? "bg-purple text-white" : "bg-pink-accent text-pink-ink"}`}>{t}</span>)}
          </div>
        )}
        {(event?.label || when) && <p className="text-sm text-muted-foreground">{[event?.label, when].filter(Boolean).join(" · ")}</p>}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">Caption</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{draft.caption || "—"}</p>
        </div>
        {approved && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-lime">
            <CheckCircle2 className="size-4" /> Approved{draft.approved_by_name ? ` by ${draft.approved_by_name}` : ""}{draft.approved_at ? ` · ${new Date(draft.approved_at).toLocaleDateString("en-AU")}` : ""}
          </p>
        )}
        {draft.approval_status === "amends" && !approved && <p className="text-sm font-medium text-purple-soft">Amends requested</p>}
        {draft.comments.length > 0 && (
          <ul className="space-y-2 border-t border-border pt-3">
            {draft.comments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">{c.author_name || "Reviewer"}</span>
                <span className="text-muted-foreground"> · {new Date(c.created_at).toLocaleDateString("en-AU")}</span>
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto space-y-2 pt-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={80} aria-label="Your name" />
          {showAmends && (
            <>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What needs changing?" maxLength={1000} aria-label="Amend comment" />
              <Button type="button" className="w-full" disabled={busy || !body.trim()} onClick={sendComment}>Send comment</Button>
            </>
          )}
          <div className="flex gap-2">
            <Button type="button" variant={approved ? "outline" : "default"} className="flex-1" disabled={busy} onClick={toggleApprove}>
              <CheckCircle2 className="size-4" /> {approved ? "Undo approval" : "Approve"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => setShowAmends((s) => !s)}>
              <MessageSquare className="size-4" /> Request amends
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
