import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createStatsRequest, getStatsScreenshotUrls, sendStatsCheck } from "@/lib/post-stats.functions";
import { STATS_FIELDS, DEFAULT_STATS_FIELDS, type StatsAnswers, type StatsFieldKey } from "@/lib/post-stats-fields";

type Req = {
  id: string;
  token: string;
  email: string | null;
  status: string;
  requested_fields: string[];
  answers: StatsAnswers;
  screenshot_paths: string[];
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  viewed: "Viewed",
  submitted: "Submitted",
  applied: "Applied",
};

function num(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function StatsRequestPanel({
  postId,
  creatorId,
  creatorName,
  campaignTitle,
  followers,
  onApplied,
}: {
  postId: string;
  creatorId: string;
  creatorName: string;
  campaignTitle?: string;
  followers: number | null;
  onApplied: () => Promise<void>;
}) {
  const create = useServerFn(createStatsRequest);
  const shots = useServerFn(getStatsScreenshotUrls);
  const sendCheck = useServerFn(sendStatsCheck);
  const [latest, setLatest] = useState<Req | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<StatsFieldKey[]>(DEFAULT_STATS_FIELDS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const [checkBusy, setCheckBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("post_stats_requests")
      .select("id, token, email, status, requested_fields, answers, screenshot_paths, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(1);
    setLatest(((data ?? [])[0] as unknown as Req) ?? null);
  }, [postId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function openDialog() {
    // Prefill email from the latest request for this creator.
    const { data } = await supabase
      .from("post_stats_requests")
      .select("email")
      .eq("creator_id", creatorId)
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    setEmail(latest?.email ?? (data?.[0]?.email as string | undefined) ?? "");
    setMessage(
      `Thanks again for your post${campaignTitle ? ` for ${campaignTitle}` : ""}! Could you share the in-app insights for it so we can include them in the client's campaign report?`,
    );
    setOpen(true);
  }

  async function go(send: boolean) {
    setBusy(true);
    try {
      const r = await create({ data: { postId, email, fields, message, send } });
      await navigator.clipboard.writeText(r.formUrl).catch(() => {});
      if (send) {
        toast.success(r.emailStatus === "sent" ? "Request sent — copy sent to community@" : "This address has unsubscribed — link copied instead");
      } else toast.success("Link copied");
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openReview() {
    setReview(true);
    setUrls([]);
    if (latest && latest.screenshot_paths?.length) {
      try { setUrls((await shots({ data: { requestId: latest.id } })).urls); } catch { /* ignore */ }
    }
  }

  async function apply() {
    if (!latest) return;
    const v = { ...(latest.answers.extracted ?? {}), ...(latest.answers.values ?? {}) };
    const patch: Record<string, number> = {};
    for (const k of ["views", "likes", "comments", "shares", "saves", "watch_time_hours"] as const) {
      const n = num(v[k]);
      if (n != null) patch[k] = k === "watch_time_hours" ? n : Math.round(n);
    }
    const reach = num(v.reach);
    if (reach != null && followers && followers > 0) patch.reach_pct = Number(((reach / followers) * 100).toFixed(2));
    if (Object.keys(patch).length === 0) return toast.error("No numbers to apply");
    const { error } = await supabase.from("campaign_report_posts").update(patch as never).eq("id", postId);
    if (error) return toast.error(error.message);
    await supabase.from("post_stats_requests").update({ status: "applied" }).eq("id", latest.id);
    toast.success("Stats applied to the post");
    setReview(false);
    await refresh();
    await onApplied();
  }

  async function submitCheck() {
    if (!latest || checkBusy) return;
    setCheckBusy(true);
    try {
      const result = await sendCheck({ data: { requestId: latest.id, message: checkMessage } });
      if (result.sent) {
        toast.success("Stats check sent to the creator");
        setCheckOpen(false);
      } else toast.error("This address has unsubscribed; the email was not sent.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCheckBusy(false);
    }
  }

  const status = latest?.status;
  const chipClass =
    status === "submitted"
      ? "bg-primary text-primary-foreground"
      : status === "applied"
        ? "bg-accent text-accent-foreground"
        : "border border-border text-muted-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={openDialog}>
        <Mail className="size-4" /> Request stats
      </Button>
      {latest && (
        <>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chipClass}`}>
            {STATUS_LABEL[latest.status] ?? latest.status}
          </span>
          {(status === "submitted" || status === "applied") && (
            <Button type="button" size="sm" variant="ghost" onClick={openReview}>Review stats</Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Copy creator link"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/stats/${latest.token}`).then(() => toast.success("Link copied"))}
          >
            <Copy className="size-4" />
          </Button>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request stats from {creatorName}</DialogTitle>
            <DialogDescription>They get a no-login link to type numbers or upload a screenshot. A copy goes to community@createracket.com.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sr-email">Creator email</Label>
              <Input id="sr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="creator@email.com" />
            </div>
            <div>
              <Label>Stats to request</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATS_FIELDS.map((f) => {
                  const on = fields.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFields(on ? fields.filter((x) => x !== f.key) : [...fields, f.key])}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="sr-msg">Message</Label>
              <Textarea id="sr-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy || fields.length === 0} onClick={() => go(false)}>Copy link only</Button>
              <Button type="button" disabled={busy || fields.length === 0 || !email} onClick={() => go(true)}>{busy ? "Sending…" : "Send request"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stats from {creatorName}</DialogTitle>
            <DialogDescription>Check the numbers against the screenshot, then apply them to the post.</DialogDescription>
          </DialogHeader>
          {latest && (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">Stat</th><th>Typed</th><th>From screenshot</th></tr></thead>
                <tbody>
                  {STATS_FIELDS.filter((f) => latest.requested_fields.includes(f.key)).map((f) => {
                    const t = latest.answers.values?.[f.key];
                    const x = latest.answers.extracted?.[f.key];
                    const mismatch = t && x && num(t) != null && num(x) != null && num(t) !== num(x);
                    return (
                      <tr key={f.key} className="border-t border-border">
                        <td className="py-1.5">{f.label}</td>
                        <td>{t ?? "—"}</td>
                        <td className={mismatch ? "font-semibold text-destructive" : ""}>{x ?? "—"}{mismatch ? " · doesn't match" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {latest.answers.note && <p className="rounded border border-border p-2 text-sm whitespace-pre-wrap">{latest.answers.note}</p>}
              {urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Screenshot" className="max-h-64 w-full rounded border border-border object-contain" /></a>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Apply copies views, likes, comments, shares, saves and watch time (typed values win over screenshot values). Reach becomes reach % using the post's follower count.</p>
              <div className="flex flex-wrap justify-end gap-2">
                {latest.status === "submitted" && (
                  <Button type="button" className="bg-pink-accent text-primary-foreground hover:bg-pink-accent/90" onClick={() => {
                    setCheckMessage(`Thanks for sharing your insights for ${campaignTitle || "the campaign"}. Could you check the stats below are correct before we add them to the report? If anything needs changing, please update your response using the link in this email or reply to let us know.`);
                    setReview(false);
                    setCheckOpen(true);
                  }}>Check stats - contact creator</Button>
                )}
                <Button type="button" onClick={apply}>{latest.status === "applied" ? "Apply again" : "Apply to post"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={checkOpen} onOpenChange={(next) => { setCheckOpen(next); if (!next) setReview(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Check stats with {creatorName}</DialogTitle>
            <DialogDescription>Review the draft before emailing {latest?.email || "the creator"}. They can update their answers using their original link. A copy goes to community@createracket.com.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stats-check-message">Email message</Label>
              <Textarea id="stats-check-message" rows={6} value={checkMessage} onChange={(e) => setCheckMessage(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">The email also includes the submitted stats, the post link, and a button to correct their response.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCheckOpen(false)} disabled={checkBusy}>Cancel</Button>
              <Button type="button" className="bg-pink-accent text-primary-foreground hover:bg-pink-accent/90" onClick={submitCheck} disabled={checkBusy || !checkMessage.trim() || !latest?.email}>{checkBusy ? "Sending…" : "Send email"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
