import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";
import { validateSlug, normalizeSlug } from "@/lib/slugs";
import { runProfileSync } from "@/lib/campaign-scrapers.functions";
import { getMyUsage } from "@/lib/usage.functions";
import { isNameMatch, MISMATCH_MESSAGE } from "@/lib/streaming-match";
import { COUNTRIES } from "@/lib/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, X } from "lucide-react";


export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Edit profile — Create Racket" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EditProfilePage,
});

type ProfileSocials = {
  instagram?: string;
  tiktok?: string;
  spotify?: string;
  apple_music?: string;
  youtube?: string;
  twitch?: string;
  facebook?: string;
  x?: string;
  custom_label?: string;
  custom_url?: string;
  website?: string;
};


const emptyForm = {
  slug: "",
  display_name: "",
  artist_name: "",
  location: "",
  bio: "",
  avatar_url: "",
  socials: { instagram: "", tiktok: "", spotify: "", apple_music: "", youtube: "", twitch: "", facebook: "", x: "", custom_label: "", custom_url: "", website: "" } as ProfileSocials,
  total_followers: "",
  total_streams: "",
  monthly_streams: "",
  avg_reach: "",
  avg_engagement: "",
  top_audience_location: "",
  flagged_streaming_mismatch: false,
  flagged_streaming_reason: "" as string | null,
};


function EditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [accountType, setAccountType] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string>("");
  const [slugStatus, setSlugStatus] = useState<
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "invalid"; reason: string }
    | { kind: "taken" }
    | { kind: "available" }
    | { kind: "unchanged" }
  >({ kind: "idle" });

  // Live slug availability check (debounced)
  useEffect(() => {
    const raw = form.slug;
    if (!raw) { setSlugStatus({ kind: "idle" }); return; }
    const v = validateSlug(raw);
    if (!v.ok) { setSlugStatus({ kind: "invalid", reason: v.reason }); return; }
    if (v.normalized === originalSlug) { setSlugStatus({ kind: "unchanged" }); return; }
    setSlugStatus({ kind: "checking" });
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("public_profiles")
        .select("id")
        .eq("slug", v.normalized)
        .maybeSingle();
      if (cancelled) return;
      if (data && data.id !== userId) setSlugStatus({ kind: "taken" });
      else setSlugStatus({ kind: "available" });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.slug, originalSlug, userId]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(u.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setOriginalSlug(d.slug ?? "");
        setAccountType(d.account_type ?? null);

        setForm({
          slug: d.slug ?? "",
          display_name: d.display_name ?? "",
          artist_name: d.artist_name ?? "",
          location: d.location ?? "",
          bio: d.bio ?? "",
          avatar_url: d.avatar_url ?? "",
          socials: { instagram: "", tiktok: "", spotify: "", apple_music: "", youtube: "", twitch: "", facebook: "", x: "", custom_label: "", custom_url: "", website: "", ...(d.socials ?? {}) },
          total_followers: d.total_followers?.toString() ?? "",
          total_streams: d.total_streams?.toString() ?? "",
          monthly_streams: d.monthly_streams?.toString() ?? "",
          avg_reach: d.avg_reach?.toString() ?? "",
          avg_engagement: d.avg_engagement?.toString() ?? "",
          top_audience_location: d.top_audience_location ?? "",
          flagged_streaming_mismatch: d.flagged_streaming_mismatch ?? false,
          flagged_streaming_reason: d.flagged_streaming_reason ?? "",
        });
      }
      setLoading(false);
    })();
  }, [navigate]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setSocial(k: keyof ProfileSocials, v: string) {
    setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }));
  }

  const runSync = useServerFn(runProfileSync);
  const loadUsage = useServerFn(getMyUsage);
  const [fetching, setFetching] = useState<string | null>(null);
  const [fetchedCounts, setFetchedCounts] = useState<{ instagram?: number; tiktok?: number; youtube?: number; twitch?: number; facebook?: number; x?: number }>({});
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [syncQuota, setSyncQuota] = useState<{ remaining: number; limit: number; resets: string } | null>(null);

  useEffect(() => {
    loadUsage({ data: {} })
      .then((r) => {
        const row = r.actions.find((a) => a.action === "profile_sync");
        if (row) setSyncQuota({ remaining: row.remaining, limit: row.limit, resets: row.resets });
      })
      .catch(() => undefined);
  }, [loadUsage]);

  const syncAllowanceLabel = !syncQuota
    ? "Syncs all connected links at once."
    : syncQuota.remaining < 0
      ? "Unlimited syncs (admin)."
      : syncQuota.remaining > 0
        ? `${syncQuota.remaining} of ${syncQuota.limit} sync${syncQuota.limit === 1 ? "" : "s"} left this month.`
        : `No syncs left — resets ${syncQuota.resets}.`;

  function candidateNames() {
    return [form.display_name, form.artist_name, form.slug];
  }

  function normaliseSocial(platform: "instagram" | "tiktok" | "youtube", raw: string) {
    const url = raw.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const h = url.replace(/^@/, "");
    if (platform === "instagram") return `https://instagram.com/${h}`;
    if (platform === "tiktok") return `https://tiktok.com/@${h}`;
    return `https://youtube.com/@${h}`;
  }

  /** One metered run that refreshes every connected platform. */
  async function syncAll() {
    const payload = {
      instagram_url: normaliseSocial("instagram", form.socials.instagram ?? ""),
      tiktok_url: normaliseSocial("tiktok", form.socials.tiktok ?? ""),
      youtube_url: normaliseSocial("youtube", form.socials.youtube ?? ""),
      twitch_url: (form.socials.twitch ?? "").trim() || null,
      facebook_url: (form.socials.facebook ?? "").trim() || null,
      x_url: (form.socials.x ?? "").trim() || null,
      spotify_url: (form.socials.spotify ?? "").trim() || null,
      apple_music_url: (form.socials.apple_music ?? "").trim() || null,
    };
    if (!Object.values(payload).some(Boolean)) {
      toast.error("Add at least one social or streaming link first");
      return;
    }
    setFetching("all");
    try {
      const r = await runSync({ data: payload });
      if (!r.ok) {
        toast.error(r.error ?? "Sync unavailable");
        if (r.resets) setSyncQuota((q) => (q ? { ...q, remaining: 0, resets: r.resets! } : q));
        return;
      }
      if (typeof r.remaining === "number") {
        setSyncQuota((q) => (q ? { ...q, remaining: r.remaining!, resets: r.resets ?? q.resets } : q));
      }

      const parts: string[] = [];
      const counts: { instagram?: number; tiktok?: number; youtube?: number; twitch?: number; facebook?: number; x?: number } = {};
      (["instagram", "tiktok", "youtube", "twitch", "facebook", "x"] as const).forEach((p) => {
        const res = r[p];
        if (res && res.ok && res.followers != null) {
          counts[p] = res.followers;
          parts.push(`${p}: ${res.followers.toLocaleString()}`);
        }
      });
      if (Object.keys(counts).length) setFetchedCounts((c) => ({ ...c, ...counts }));

      let mismatch: string | null = null;
      const sp = r.spotify;
      if (sp && sp.ok) {
        if (sp.followers != null) setForm((f) => ({ ...f, total_followers: String(sp.followers ?? "") }));
        if (sp.monthly_listeners != null) {
          setForm((f) => ({ ...f, monthly_streams: String(sp.monthly_listeners ?? "") }));
          parts.push(`${sp.monthly_listeners.toLocaleString()} monthly listeners`);
        }
        if (sp.total_streams != null) {
          setForm((f) => ({ ...f, total_streams: String(sp.total_streams ?? "") }));
          parts.push(`${sp.total_streams.toLocaleString()} total streams`);
        }
        if (sp.name && !isNameMatch(sp.name, candidateNames())) {
          mismatch = `Spotify artist "${sp.name}" does not match profile name.`;
        }
      }
      const am = r.apple;
      if (am && am.ok && am.name && !isNameMatch(am.name, candidateNames())) {
        mismatch = mismatch ?? `Apple Music artist "${am.name}" does not match profile name.`;
      }
      if (mismatch) {
        setForm((f) => ({ ...f, flagged_streaming_mismatch: true, flagged_streaming_reason: mismatch! }));
        setMismatchWarning(MISMATCH_MESSAGE);
      } else {
        setMismatchWarning(null);
      }

      toast.success(parts.length ? `Synced — ${parts.join(" · ")}` : "Sync finished, but no numbers were returned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setFetching(null);
    }
  }


  function applyTotalFromFetched() {
    const total =
      (fetchedCounts.instagram ?? 0) +
      (fetchedCounts.tiktok ?? 0) +
      (fetchedCounts.youtube ?? 0) +
      (fetchedCounts.twitch ?? 0) +
      (fetchedCounts.facebook ?? 0) +
      (fetchedCounts.x ?? 0);
    if (total <= 0) {
      toast.error("Fetch at least one social first");
      return;
    }
    set("total_followers", String(total));
    toast.success(`Total followers set to ${total.toLocaleString()}`);
  }


  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      e.target.value = "";
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAvatarUpload() {
    if (!pendingFile || !userId) {
      toast.error("Choose a profile photo before uploading");
      return;
    }
    setUploading(true);
    const ext = pendingFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, pendingFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: pendingFile.type,
    });
    if (upErr) {
      setUploading(false);
      toast.error(`Photo upload failed: ${upErr.message}`);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // Persist immediately so it can't be lost between steps
    const { error: saveErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    if (saveErr) {
      setUploading(false);
      toast.error(`Saved photo but couldn't update profile: ${saveErr.message}`);
      return;
    }

    set("avatar_url", publicUrl);
    clearPending();
    setUploading(false);
    toast.success("Profile photo updated ✓");
  }



  function num(v: string): number | null {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (pendingFile) {
      toast.error("Please upload or cancel the selected profile photo before saving.");
      return;
    }
    let slug: string | null = null;
    if (form.slug.trim()) {
      const v = validateSlug(form.slug);
      if (!v.ok) { toast.error(v.reason); return; }
      slug = v.normalized;
      if (slugStatus.kind === "taken") { toast.error("That URL slug is already taken — try another"); return; }
      if (slugStatus.kind === "checking") { toast.error("Still checking slug availability — try again in a sec"); return; }
    }
    setSaving(true);
    const cleanSocials: ProfileSocials = {};
    (Object.keys(form.socials) as Array<keyof ProfileSocials>).forEach((k) => {
      const v = (form.socials[k] || "").trim();
      if (v) cleanSocials[k] = v;
    });
    const payload: any = {
      id: userId,
      slug: slug || null,
      display_name: form.display_name.trim() || null,
      artist_name: form.artist_name.trim() || null,
      location: form.location.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url || null,
      socials: cleanSocials,
      total_followers: num(form.total_followers),
      total_streams: num(form.total_streams),
      monthly_streams: num(form.monthly_streams),
      avg_reach: num(form.avg_reach),
      avg_engagement: num(form.avg_engagement),
      top_audience_location: form.top_audience_location.trim() || null,
      flagged_streaming_mismatch: form.flagged_streaming_mismatch,
      flagged_streaming_reason: form.flagged_streaming_reason || null,
    };
    const bad = findProfanityIn(payload);
    if (bad) {
      setSaving(false);
      toast.error("Please remove offensive or inappropriate language from your profile before saving.");
      return;
    }
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        toast.error("That URL slug is already taken — try another");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setOriginalSlug(slug ?? "");
    toast.success(form.avatar_url ? "Profile updated with your thumbnail" : "Profile updated");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Your profile</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Edit profile</h1>
            <p className="mt-2 text-muted-foreground">All fields are optional. Set a URL slug to make your profile publicly viewable.</p>
          </div>
          {form.slug ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/u/$slug" params={{ slug: form.slug }}>
                View public page <ExternalLink className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Basics</CardTitle>
            <CardDescription>How you appear across Create Racket.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="slug">Custom URL slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/u/</span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => set("slug", normalizeSlug(e.target.value))}
                    placeholder="your-name"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <div className="w-5 shrink-0">
                    {slugStatus.kind === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    {slugStatus.kind === "available" ? <Check className="size-4 text-emerald-500" /> : null}
                    {(slugStatus.kind === "taken" || slugStatus.kind === "invalid") ? <X className="size-4 text-destructive" /> : null}
                  </div>
                </div>
                {slugStatus.kind === "available" ? (
                  <p className="text-xs text-emerald-500">Nice — /u/{form.slug} is available.</p>
                ) : slugStatus.kind === "unchanged" ? (
                  <p className="text-xs text-muted-foreground">This is your current public URL.</p>
                ) : slugStatus.kind === "taken" ? (
                  <p className="text-xs text-destructive">That slug is already taken — try another.</p>
                ) : slugStatus.kind === "invalid" ? (
                  <p className="text-xs text-destructive">{slugStatus.reason}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">2–30 characters, lowercase letters, numbers and hyphens. Leave blank to keep your profile private.</p>
                )}
              </div>


              <div className="md:col-span-2">
                <Label>Profile photo (1:1)</Label>
                <div className="mt-2 flex flex-wrap items-start gap-3">
                  <div className="size-28 overflow-hidden rounded-full border border-border/60 bg-muted/40">
                    {(pendingPreview || form.avatar_url) ? (
                      <img src={pendingPreview || form.avatar_url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} disabled={uploading} />
                    <div className="flex flex-wrap gap-2">
                      {pendingFile ? (
                        <>
                          <Button type="button" size="sm" onClick={handleAvatarUpload} disabled={uploading}>
                            {uploading ? "Uploading…" : "Upload"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={clearPending} disabled={uploading}>
                            Cancel
                          </Button>
                        </>
                      ) : null}
                      {!pendingFile && form.avatar_url ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => set("avatar_url", "")}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPG or PNG, up to 8MB. {pendingFile ? "Click Upload to save your new photo." : "Your photo saves as soon as you click Upload."}
                    </p>

                  </div>
                </div>
              </div>


              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="artist">Artist name</Label>
                <Input id="artist" value={form.artist_name} onChange={(e) => set("artist_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loc">Location</Label>
                <Select value={form.location || "__none"} onValueChange={(v) => set("location", v === "__none" ? "" : v)}>
                  <SelectTrigger id="loc"><SelectValue placeholder="Select a country" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none">— None —</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Top audience locations (up to 3 countries)</Label>
                {(() => {
                  const parts = form.top_audience_location
                    ? form.top_audience_location.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  const slots: string[] = [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
                  const updateSlot = (i: number, v: string) => {
                    const next = [...slots];
                    next[i] = v === "__none" ? "" : v;
                    const joined = next.filter(Boolean).join(", ");
                    set("top_audience_location", joined);
                  };
                  return (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {slots.map((val, i) => (
                        <Select key={i} value={val || "__none"} onValueChange={(v) => updateSlot(i, v)}>
                          <SelectTrigger><SelectValue placeholder={`Country ${i + 1}`} /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            <SelectItem value="__none">— None —</SelectItem>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground">City-level data coming soon — pick the countries your audience is strongest in for now.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acctype">Account type</Label>
                <Input
                  id="acctype"
                  value={accountType ? accountType.charAt(0).toUpperCase() + accountType.slice(1) : "—"}
                  readOnly
                  disabled
                  title="Set at sign up — contact support to change"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
              </div>

              <div className="md:col-span-2 pt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Socials</p>
                <div className="flex flex-col items-end gap-0.5">
                  <Button type="button" size="sm" variant="outline" onClick={syncAll} disabled={fetching === "all"}>
                    <RefreshCw className={`mr-1.5 size-3.5 ${fetching === "all" ? "animate-spin" : ""}`} />
                    {fetching === "all" ? "Syncing…" : "Sync my numbers"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">{syncAllowanceLabel}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ig">Instagram</Label>
                <Input id="ig" value={form.socials.instagram ?? ""} onChange={(e) => setSocial("instagram", e.target.value)} placeholder="@handle or full URL" />
                {fetchedCounts.instagram != null ? <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.instagram.toLocaleString()}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tt">TikTok</Label>
                <Input id="tt" value={form.socials.tiktok ?? ""} onChange={(e) => setSocial("tiktok", e.target.value)} placeholder="@handle or full URL" />
                {fetchedCounts.tiktok != null ? <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.tiktok.toLocaleString()}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp">Spotify</Label>
                <Input id="sp" value={form.socials.spotify ?? ""} onChange={(e) => setSocial("spotify", e.target.value)} placeholder="https://open.spotify.com/artist/…" />
                <p className="text-[11px] text-muted-foreground">Auto-syncs followers, monthly listeners and total streams.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am">Apple Music</Label>
                <Input id="am" value={form.socials.apple_music ?? ""} onChange={(e) => setSocial("apple_music", e.target.value)} placeholder="https://music.apple.com/…/artist/…" />
                <p className="text-[11px] text-muted-foreground">Verifies the artist name against your profile.</p>
              </div>
              {mismatchWarning ? (
                <div className="md:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  {mismatchWarning}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="yt">YouTube</Label>
                <Input id="yt" value={form.socials.youtube ?? ""} onChange={(e) => setSocial("youtube", e.target.value)} placeholder="@handle or full URL" />
                {fetchedCounts.youtube != null ? <p className="text-xs text-muted-foreground">Fetched: {fetchedCounts.youtube.toLocaleString()}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="twitch">Twitch</Label>
                <Input id="twitch" value={form.socials.twitch ?? ""} onChange={(e) => setSocial("twitch", e.target.value)} placeholder="@handle or full URL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fb">Facebook</Label>
                <Input id="fb" value={form.socials.facebook ?? ""} onChange={(e) => setSocial("facebook", e.target.value)} placeholder="Page name or full URL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="xcom">X</Label>
                <Input id="xcom" value={form.socials.x ?? ""} onChange={(e) => setSocial("x", e.target.value)} placeholder="@handle or full URL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clabel">Other link label</Label>
                <Input id="clabel" value={form.socials.custom_label ?? ""} onChange={(e) => setSocial("custom_label", e.target.value)} placeholder="e.g. Bandcamp" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="curl">Other link URL</Label>
                <Input id="curl" value={form.socials.custom_url ?? ""} onChange={(e) => setSocial("custom_url", e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="web">Website</Label>
                <Input id="web" value={form.socials.website ?? ""} onChange={(e) => setSocial("website", e.target.value)} placeholder="https://…" />
              </div>
              <div className="md:col-span-2">
                <Button type="button" size="sm" variant="outline" onClick={applyTotalFromFetched}>
                  Auto calculate your followers
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">Sums fetched Instagram, TikTok and YouTube counts into Total social audience below. Total fans adds your monthly streams on top.</p>
              </div>



              <div className="md:col-span-2 pt-2">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Key metrics</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tf">Total social audience</Label>
                <Input id="tf" inputMode="numeric" value={form.total_followers} onChange={(e) => set("total_followers", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts">Total streams</Label>
                <Input id="ts" inputMode="numeric" value={form.total_streams} onChange={(e) => set("total_streams", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms">Monthly streams</Label>
                <Input id="ms" inputMode="numeric" value={form.monthly_streams} onChange={(e) => set("monthly_streams", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar">Avg. reach</Label>
                <Input id="ar" inputMode="numeric" value={form.avg_reach} onChange={(e) => set("avg_reach", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ae">Avg. engagement</Label>
                <Input id="ae" inputMode="decimal" value={form.avg_engagement} onChange={(e) => set("avg_engagement", e.target.value)} placeholder="e.g. 4.2 (%)" />
              </div>

              <div className="md:col-span-2 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
