import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Upload, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getTalentIntake,
  submitTalentIntake,
  suggestTalentSocials,
  uploadTalentPhoto,
  SOCIAL_KEYS,
  type SocialKey,
  type SocialSuggestion,
} from "@/lib/talent-intake.functions";

export const Route = createFileRoute("/talent/$token")({
  head: () => ({
    meta: [
      { title: "Tell us about you — Create Racket" },
      { name: "description", content: "Share your socials and a few details so we can build your Create Racket spotlight." },
      { property: "og:title", content: "Tell us about you — Create Racket" },
      { property: "og:description", content: "Share your socials so we can build your spotlight page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TalentForm,
});

const LABELS: Record<SocialKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  spotify: "Spotify",
  apple_music: "Apple Music",
  facebook: "Facebook",
  x: "X (Twitter)",
  twitch: "Twitch",
};

type State = "loading" | "missing" | "done" | "open";

function TalentForm() {
  const { token } = Route.useParams();
  const load = useServerFn(getTalentIntake);
  const suggest = useServerFn(suggestTalentSocials);
  const upload = useServerFn(uploadTalentPhoto);
  const submit = useServerFn(submitTalentIntake);

  const [state, setState] = useState<State>("loading");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [socials, setSocials] = useState<Record<SocialKey, string>>(
    () => Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])) as Record<SocialKey, string>,
  );
  const [hints, setHints] = useState<Partial<Record<SocialKey, SocialSuggestion["source"]>>>({});
  const [finding, setFinding] = useState(false);
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([""]);
  const [followers, setFollowers] = useState("");
  const [audience, setAudience] = useState("");
  const [partners, setPartners] = useState("");
  const [extra, setExtra] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load({ data: { token } })
      .then((r) => {
        if (!r.found) return setState("missing");
        if (r.submitted) return setState("done");
        setName(r.artistName);
        setState("open");
      })
      .catch(() => setState("missing"));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function findSocials() {
    if (!name.trim()) return toast.error("Add your artist or band name first.");
    setFinding(true);
    try {
      const found = await suggest({ data: { token, name: name.trim(), ...(website.trim() ? { website: website.trim() } : {}) } });
      const nextHints: typeof hints = {};
      setSocials((s) => {
        const next = { ...s };
        for (const k of SOCIAL_KEYS) {
          const f = found[k];
          if (f && !s[k]) {
            next[k] = f.url;
            nextHints[k] = f.source;
          }
        }
        return next;
      });
      setHints(nextHints);
      const n = Object.keys(found).length;
      toast.success(n ? "We've filled in what we found — please check each one." : "We couldn't find anything — add your links below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't search right now.");
    } finally {
      setFinding(false);
    }
  }

  async function addPhoto(file: File) {
    if (photos.length >= 4) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Photos must be under 8MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPG, PNG or WebP photo.");
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const { publicUrl } = await upload({ data: { token, base64: btoa(bin), contentType: file.type as "image/jpeg" } });
      setPhotos((p) => [...p, publicUrl]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function send(skipped: boolean) {
    if (!name.trim()) return toast.error("Add your artist or band name first.");
    setSending(true);
    try {
      const trimmed = Object.fromEntries(SOCIAL_KEYS.map((k) => [k, socials[k].trim() || undefined]));
      await submit({
        data: {
          token,
          answers: {
            artist_name: name.trim(),
            website: website.trim() || undefined,
            contact_email: email.trim() || undefined,
            socials: trimmed,
            bio: bio.trim() || undefined,
            photos,
            videos: videos.map((v) => v.trim()).filter(Boolean),
            followers: followers.trim() || undefined,
            audience: audience.trim() || undefined,
            partners: partners.trim() || undefined,
            extra: extra.trim() || undefined,
            skipped,
          },
        },
      });
      setState("done");
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (state === "loading") return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (state === "missing")
    return (
      <Shell>
        <h1 className="font-display text-3xl">This link isn't working</h1>
        <p className="mt-2 text-muted-foreground">
          Please ask the Create Racket team for a fresh link, or email{" "}
          <a className="underline" href="mailto:community@createracket.com">community@createracket.com</a>.
        </p>
      </Shell>
    );
  if (state === "done")
    return (
      <Shell>
        <h1 className="font-display text-3xl">Thanks — we've got it!</h1>
        <p className="mt-2 text-muted-foreground">The Create Racket team will build your spotlight and be in touch soon.</p>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="font-display text-3xl sm:text-4xl">Tell us about you</h1>
      <p className="mt-2 text-muted-foreground">
        Share your socials and we'll build your Create Racket spotlight. Only your name is required — skip anything
        you like and we'll fill in the rest.
      </p>

      <section className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="t-name">Artist or band name *</Label>
          <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rageflower" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-web">Website (optional)</Label>
          <Input id="t-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourband.com" />
        </div>
        <Button type="button" onClick={findSocials} disabled={finding}>
          <Sparkles className="mr-2 h-4 w-4" />
          {finding ? "Looking…" : "Find my socials"}
        </Button>
        <p className="text-xs text-muted-foreground">We'll look for your pages and fill them in below for you to check.</p>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-medium">Your social pages</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`t-${k}`} className="flex items-center gap-2 text-sm">
                {LABELS[k]}
                {hints[k] && socials[k] ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${hints[k] === "website" ? "bg-primary/15 text-primary" : "bg-pink-accent/20 text-foreground"}`}>
                    {hints[k] === "website" ? "Found on your website" : "Best guess — please check"}
                  </span>
                ) : null}
              </Label>
              <Input
                id={`t-${k}`}
                value={socials[k]}
                onChange={(e) => {
                  setSocials((s) => ({ ...s, [k]: e.target.value }));
                  setHints((h) => ({ ...h, [k]: undefined }));
                }}
                placeholder="Link or @handle"
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-email">Best contact email (optional)</Label>
          <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border/60 p-5">
        <p className="flex-1 text-sm text-muted-foreground">Short on time? Send what you've got and we'll do the rest.</p>
        <Button type="button" variant="outline" onClick={() => send(true)} disabled={sending}>
          Skip the rest & send
        </Button>
      </div>

      <section className="mt-6 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-medium">A bit more (all optional)</h2>
        <Field id="t-bio" label="About you" value={bio} onChange={setBio} rows={4} placeholder="Who you are, your sound, what's coming up…" />

        <div className="space-y-2">
          <Label>Photos (up to 4)</Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <div key={p} className="relative h-20 w-20 overflow-hidden rounded-md border border-border/60">
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setPhotos((x) => x.filter((y) => y !== p))} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 4 ? (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                <Upload className="mb-1 h-4 w-4" />
                {uploading ? "…" : "Add"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ""; }} />
              </label>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Video links (YouTube, TikTok, Instagram)</Label>
          {videos.map((v, i) => (
            <Input key={i} value={v} onChange={(e) => setVideos((x) => x.map((y, j) => (j === i ? e.target.value : y)))} placeholder="https://…" />
          ))}
          {videos.length < 4 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setVideos((x) => [...x, ""])}>+ Add another video</Button>
          ) : null}
        </div>

        <Field id="t-stats" label="Audience & stats" value={followers} onChange={setFollowers} rows={2} placeholder="e.g. 40k Instagram, 120k monthly Spotify listeners" />
        <Field id="t-aud" label="Who's your audience?" value={audience} onChange={setAudience} rows={2} placeholder="Ages, locations, interests…" />
        <Field id="t-partners" label="Past brand partners" value={partners} onChange={setPartners} rows={2} placeholder="Brand names or links" />
        <Field id="t-extra" label="Anything else?" value={extra} onChange={setExtra} rows={3} placeholder="Tours, releases, dream brands…" />
      </section>

      <div className="mt-6 flex justify-end">
        <Button type="button" size="lg" onClick={() => send(false)} disabled={sending || uploading}>
          {sending ? "Sending…" : "Send to Create Racket"}
        </Button>
      </div>
    </Shell>
  );
}

function Field(props: { id: string; label: string; value: string; onChange: (v: string) => void; rows: number; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Textarea id={props.id} rows={props.rows} value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12">{children}</main>
    </div>
  );
}
