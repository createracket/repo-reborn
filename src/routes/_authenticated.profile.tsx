import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
import { Check, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Edit profile — Create Racket" }],
  }),
  component: EditProfilePage,
});

type ProfileSocials = {
  instagram?: string;
  tiktok?: string;
  spotify?: string;
  youtube?: string;
  website?: string;
};

const emptyForm = {
  slug: "",
  display_name: "",
  artist_name: "",
  location: "",
  bio: "",
  avatar_url: "",
  socials: { instagram: "", tiktok: "", spotify: "", youtube: "", website: "" } as ProfileSocials,
  total_followers: "",
  total_streams: "",
  monthly_streams: "",
  avg_reach: "",
  avg_engagement: "",
  top_audience_location: "",
};

function EditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
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
        setForm({
          slug: d.slug ?? "",
          display_name: d.display_name ?? "",
          artist_name: d.artist_name ?? "",
          location: d.location ?? "",
          bio: d.bio ?? "",
          avatar_url: d.avatar_url ?? "",
          socials: { instagram: "", tiktok: "", spotify: "", youtube: "", website: "", ...(d.socials ?? {}) },
          total_followers: d.total_followers?.toString() ?? "",
          total_streams: d.total_streams?.toString() ?? "",
          monthly_streams: d.monthly_streams?.toString() ?? "",
          avg_reach: d.avg_reach?.toString() ?? "",
          avg_engagement: d.avg_engagement?.toString() ?? "",
          top_audience_location: d.top_audience_location ?? "",
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
                <Input id="loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="London, UK" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topaud">Top audience location</Label>
                <Input id="topaud" value={form.top_audience_location} onChange={(e) => set("top_audience_location", e.target.value)} placeholder="London, UK" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
              </div>

              <div className="md:col-span-2 pt-2">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Socials</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ig">Instagram</Label>
                <Input id="ig" value={form.socials.instagram ?? ""} onChange={(e) => setSocial("instagram", e.target.value)} placeholder="@handle or full URL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tt">TikTok</Label>
                <Input id="tt" value={form.socials.tiktok ?? ""} onChange={(e) => setSocial("tiktok", e.target.value)} placeholder="@handle or full URL" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp">Spotify</Label>
                <Input id="sp" value={form.socials.spotify ?? ""} onChange={(e) => setSocial("spotify", e.target.value)} placeholder="https://open.spotify.com/artist/…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yt">YouTube</Label>
                <Input id="yt" value={form.socials.youtube ?? ""} onChange={(e) => setSocial("youtube", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="web">Website</Label>
                <Input id="web" value={form.socials.website ?? ""} onChange={(e) => setSocial("website", e.target.value)} placeholder="https://…" />
              </div>

              <div className="md:col-span-2 pt-2">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Key metrics</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tf">Total followers</Label>
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
