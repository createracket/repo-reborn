import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ImagePlus, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resizeImageFile } from "@/lib/image-resize";
import { getStatsRequestPublic, submitStatsRequestPublic } from "@/lib/post-stats.functions";
import { STATS_FIELDS, MAX_STATS_SCREENSHOTS, type StatsFieldKey } from "@/lib/post-stats-fields";

export const Route = createFileRoute("/stats/$token")({
  head: () => ({
    meta: [
      { title: "Share your post stats — Racket" },
      { name: "description", content: "Share the in-app stats for your campaign post with the Racket team." },
      { property: "og:title", content: "Share your post stats — Racket" },
      { property: "og:description", content: "Type in your numbers or upload a screenshot of your insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StatsForm,
});

type Loaded = Extract<Awaited<ReturnType<typeof getStatsRequestPublic>>, { found: true }>;

function fileToBase64(f: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function StatsForm() {
  const { token } = Route.useParams();
  const load = useServerFn(getStatsRequestPublic);
  const submit = useServerFn(submitStatsRequestPublic);
  const [state, setState] = useState<"loading" | "missing" | "open" | "done">("loading");
  const [req, setReq] = useState<Loaded | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load({ data: { token } })
      .then((r) => {
        if (!r.found) return setState("missing");
        setReq(r);
        setValues(r.values ?? {});
        setNote(r.note ?? "");
        setState(r.locked ? "done" : "open");
      })
      .catch(() => setState("missing"));
  }, [token]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) { toast.error("Screenshots must be images"); continue; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} is over 10MB`); continue; }
      if (next.length >= MAX_STATS_SCREENSHOTS) break;
      next.push(f);
    }
    setFiles(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasValue = Object.values(values).some((v) => v?.trim());
    if (!hasValue && files.length === 0 && !(req?.screenshotCount)) {
      toast.error("Add at least one number or a screenshot");
      return;
    }
    setBusy(true);
    try {
      const images = [];
      for (const f of files) {
        const resized = await resizeImageFile(f, 1800);
        images.push({ type: "image/jpeg" as const, base64: await fileToBase64(resized) });
      }
      await submit({ data: { token, values, note, images } });
      setState("done");
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (state === "missing")
    return (
      <Shell>
        <h1 className="text-2xl font-bold">This link isn't valid</h1>
        <p className="mt-2 text-muted-foreground">Please check the email you received, or reply to it and we'll send a new link.</p>
      </Shell>
    );
  if (state === "done")
    return (
      <Shell>
        <CheckCircle2 className="size-10 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">Thank you!</h1>
        <p className="mt-2 text-muted-foreground">We've got your stats. {req?.locked ? "" : "You can reopen this link to make changes if needed."}</p>
        {!req?.locked && (
          <Button variant="outline" className="mt-4" onClick={() => { setFiles([]); setState("open"); }}>Edit my answers</Button>
        )}
      </Shell>
    );

  const fields = STATS_FIELDS.filter((f) => req!.fields.includes(f.key as StatsFieldKey));

  return (
    <Shell>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Racket · {req!.campaignTitle ?? "Campaign report"}</p>
      <h1 className="mt-2 text-3xl font-bold">{req!.creatorName ? `Hi ${req!.creatorName}, ` : ""}share your post stats</h1>
      {req!.message && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-sm">{req!.message}</p>}

      {req!.postUrl && (
        <a href={req!.postUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary">
          {req!.thumbnailUrl && <img src={req!.thumbnailUrl} alt="" className="size-16 rounded object-cover" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize">{req!.platform ?? "Your"} post</p>
            <p className="truncate text-xs text-muted-foreground">{req!.postUrl}</p>
          </div>
        </a>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Easiest: upload a screenshot</h2>
          <p className="text-sm text-muted-foreground">A screenshot of your in-app insights for this post — we'll read the numbers for you. Up to {MAX_STATS_SCREENSHOTS}, 10MB each.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                {f.name}
                <button type="button" aria-label="Remove" onClick={() => setFiles(files.filter((_, j) => j !== i))}><XIcon className="size-3" /></button>
              </span>
            ))}
          </div>
          {files.length < MAX_STATS_SCREENSHOTS && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary">
              <ImagePlus className="size-4" /> Add screenshot
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
          {req!.screenshotCount > 0 && files.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{req!.screenshotCount} screenshot(s) already received — adding new ones replaces them.</p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Or type the numbers</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.kind === "text" ? "sm:col-span-2" : ""}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  inputMode={f.kind === "number" ? "decimal" : "text"}
                  placeholder={f.kind === "number" ? "e.g. 12400" : "e.g. Australia 62%, UK 14%"}
                  value={values[f.key] ?? ""}
                  maxLength={500}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="note">Anything else? (optional)</Label>
            <Textarea id="note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>

        <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? "Sending…" : "Send my stats"}</Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-5 py-12">{children}</div>
    </main>
  );
}
