import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ExternalLink, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findCalendarEvent, draftDisplayTags, sortDraftsForReview, type ReviewDraft } from "@/lib/report-review";
import { submitDraftComment, setDraftApproval, getReviewDrafts } from "@/lib/report-review.functions";

type Draft = ReviewDraft;
type CalEvent = { date?: string | null; time?: string | null; timezone?: string | null; label?: string | null; platforms?: string[] | null };

export function ReportReviewSection({ slug, events, refreshTick }: { slug: string; events: CalEvent[]; refreshTick: number }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const loadDrafts = useServerFn(getReviewDrafts);
  useEffect(() => {
    let cancelled = false;
    loadDrafts({ data: { slug } }).then(
      (rows) => { if (cancelled) return; setError(false); setDrafts(rows ?? []); setLoading(false); },
      () => { if (cancelled) return; setError(true); setLoading(false); },
    );
    return () => { cancelled = true; };
  }, [slug, refreshTick, tick]);
  if (loading) return <p className="mt-8 text-sm text-muted-foreground">Loading drafts…</p>;
  if (error) return <p role="alert" className="mt-8 text-sm text-destructive">Drafts could not be loaded.</p>;
  if (!drafts.length) return <p className="mt-8 text-sm text-muted-foreground">No drafts to review right now.</p>;
  return (
    <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {drafts.map((d) => <DraftCard key={d.id} draft={d} event={findCalendarEvent(events, d.calendar_event_key)} onChanged={() => setTick((t) => t + 1)} hideCaptionHeading={slug === "tixel-brand-ads"} />)}
    </section>
  );
}

function DraftCard({ draft, event, onChanged, hideCaptionHeading = false }: { draft: Draft; event: CalEvent | null; onChanged: () => void; hideCaptionHeading?: boolean }) {
  const comment = useServerFn(submitDraftComment);
  const approve = useServerFn(setDraftApproval);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [showAmends, setShowAmends] = useState(false);
  const [busy, setBusy] = useState(false);
  const tags = draftDisplayTags(draft.platforms, event?.platforms, draft.platform);
  const approved = draft.approval_status === "approved";
  const unresolvedComments = draft.comments.filter((c) => !c.resolved);
  const resolvedComments = draft.comments.filter((c) => c.resolved);
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
      <div className="relative m-2 aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        {draft.media_url && (draft.media_type === "video"
          ? <video src={draft.media_url} poster={draft.thumbnail_url ?? undefined} preload={draft.thumbnail_url ? "none" : "metadata"} controls playsInline className="h-full w-full object-cover" />
          : <img src={draft.media_url} alt={draft.caption.slice(0, 80) || "Draft content"} loading="lazy" className="h-full w-full object-cover" />)}
        {!draft.media_url && draft.link_url && (
          <a href={draft.link_url} target="_blank" rel="noopener noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm font-medium text-purple-soft hover:underline">
            <ExternalLink className="size-6" /> Open draft content
          </a>
        )}
        {!draft.hide_banner && <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-muted-foreground/50 py-1 text-center text-xs font-semibold uppercase tracking-wider text-background">Draft</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 pb-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t === "TBC" ? "bg-purple text-purple-foreground" : "bg-pink-accent text-pink-ink"}`}>{t}</span>)}
          </div>
        )}
        {(event?.label || when) && <p className="text-xs text-muted-foreground">{[event?.label, when].filter(Boolean).join(" · ")}</p>}
        {draft.link_url && (
          <Button asChild variant="purple" size="sm" className="h-6 self-start gap-1 rounded-full px-2.5 text-[11px]">
            <a href={draft.link_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3" /> {hideCaptionHeading && !draft.hide_banner ? "Draft" : "Content"}</a>
          </Button>
        )}
        {hideCaptionHeading ? (
          draft.caption ? <p className="whitespace-pre-wrap break-words text-sm">{draft.caption}</p> : null
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-soft">Caption</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{draft.caption || "—"}</p>
          </div>
        )}
        {approved && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-lime-soft">
            <CheckCircle2 className="size-4" /> Approved{draft.approved_by_name ? ` by ${draft.approved_by_name}` : ""}{draft.approved_at ? ` · ${new Date(draft.approved_at).toLocaleDateString("en-AU")}` : ""}
          </p>
        )}
        {draft.approval_status === "amends" && !approved && (draft.comments.length > 0 && draft.comments.every((c) => c.resolved)
          ? <p className="text-sm font-medium text-lime-soft">Updated</p>
          : <p className="text-sm font-medium text-purple-soft">Amends requested</p>)}
        {unresolvedComments.length > 0 && (
          <ul className="space-y-2 border-t border-border pt-3">
            {unresolvedComments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">{c.author_name || "Reviewer"}</span>
                <span className="text-muted-foreground"> · {new Date(c.created_at).toLocaleDateString("en-AU")}</span>
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        {resolvedComments.length > 0 && (
          <details className="group min-w-0 border-t border-border pt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-3 shrink-0 transition-transform group-open:rotate-180" />
              See edit notes
            </summary>
            <ul className="mt-2 space-y-2">
              {resolvedComments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-medium">{c.author_name || "Reviewer"}</span>
                  <span className="text-muted-foreground"> · {new Date(c.created_at).toLocaleDateString("en-AU")}</span>
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="mt-auto space-y-2 pt-2">
          {showAmends && (
            <>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Edit notes..." maxLength={1000} aria-label="Amend comment" className="min-h-16 text-xs" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={80} aria-label="Your name (optional)" className="h-8 text-xs" />
              <Button type="button" className="w-full" disabled={busy || !body.trim()} onClick={sendComment}>Send comment</Button>
            </>
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" variant={approved ? "outline" : "default"} size="sm" className="w-full" disabled={busy} onClick={toggleApprove}>
              <CheckCircle2 className="size-4" /> {approved ? "Undo approval" : "Approve"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => setShowAmends((s) => !s)}>
              <MessageSquare className="size-4" /> Request amends
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
