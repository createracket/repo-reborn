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
import { runProfileSync, scrapePostMetrics } from "@/lib/campaign-scrapers.functions";
import { getMyUsage } from "@/lib/usage.functions";
import { isNameMatch, MISMATCH_MESSAGE } from "@/lib/streaming-match";
import { toProfileUrl, type SocialPlatform } from "@/lib/social-handles";
import { type SecondaryLink } from "@/lib/social-links";
import { uploadMyProfileImage } from "@/lib/profile-images.functions";
import type { ProfileMedia } from "@/components/profile/FeaturedMedia";
import { calculateVibeScore, calculateBrandVibe } from "@/lib/vibe-check";
import {
  DEFAULT_VIBE_CONFIG,
  loadVibeCheckConfig,
  artistArchetypeKeyFromLabel,
  brandArchetypeKeyFromLabel,
  artistArchetypeOptions,
  brandArchetypeOptions,
  type VibeCheckConfig,
} from "@/lib/vibe-check-config";
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
  /** Secondary links (band / podcast / side project) and their labels. */
  extra?: string[];
  extra_names?: string[];
};


const emptyForm = {
  slug: "",
  display_name: "",
  artist_name: "",
  location: "",
  bio: "",
  avatar_url: "",
  socials: { instagram: "", tiktok: "", spotify: "", apple_music: "", youtube: "", twitch: "", facebook: "", x: "", custom_label: "", custom_url: "", website: "" } as ProfileSocials,
  media: {} as ProfileMedia,
  vibe_tags: "",
  total_followers: "",
  total_streams: "",
  monthly_streams: "",
  avg_reach: "",
  avg_engagement: "",
  top_audience_location: "",
  flagged_streaming_mismatch: false,
  flagged_streaming_reason: "" as string | null,
};

/** Small upload control shared by the featured video covers and photos. */
function MediaUploadButton({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  const upload = useServerFn(uploadMyProfileImage);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.readAsDataURL(file);
      });
      const res = await upload({
        data: { base64, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" },
      });
      onUploaded(res.publicUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}

/** Which input a metered sync run should refresh. */
type SyncTarget =
  | "all"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitch"
  | "facebook"
  | "x"
  | "spotify"
  | "apple_music"
  | `extra:${number}`;

/**
 * Featured posts block. Memoised so typing elsewhere in the profile form doesn't
 * re-render (and re-decode) the cover thumbnails.
 */
const FeaturedPostsSection = memo(function FeaturedPostsSection({
  media,
  setMedia,
}: {
  media: ProfileMedia;
  setMedia: (k: keyof ProfileMedia, v: string) => void;
}) {
  return (
    <details className="md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Featured posts
        <span className="ml-2 text-xs font-normal text-muted-foreground">(up to four TikTok or Instagram URLs)</span>
      </summary>
      <div className="flex flex-col gap-4 px-4">
        <p className="text-xs text-muted-foreground">
          Paste public TikTok or Instagram post/reel URLs. Add a cover image for Instagram clips —
          Instagram no longer serves public thumbnails.
        </p>
        {([1, 2, 3, 4] as const).map((n) => {
          const urlKey = `video${n}` as keyof ProfileMedia;
          const coverKey = `video${n}_cover` as keyof ProfileMedia;
          const cover = media[coverKey] ?? "";
          return (
            <div key={n} className="space-y-2 rounded-md border border-border/60 p-3">
              <Label>Video {n}</Label>
              <Input
                value={media[urlKey] ?? ""}
                onChange={(e) => setMedia(urlKey, e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/… or Instagram reel URL"
              />
              <Input
                value={cover}
                onChange={(e) => setMedia(coverKey, e.target.value)}
                placeholder="Cover image URL (optional)"
              />
              {cover ? (
                <div className="w-24 overflow-hidden rounded-md border border-border/60" style={{ aspectRatio: "9 / 16" }}>
                  <img
                    src={cover}
                    alt=""
                    width={96}
                    height={171}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <FetchPreviewButton url={media[urlKey] ?? ""} onFetched={(url) => setMedia(coverKey, url)} />
                <MediaUploadButton label="Upload cover" onUploaded={(url) => setMedia(coverKey, url)} />
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
});

/** Small per-input "Auto sync" control. */
function SyncButton({ busy, disabled, onClick, label = "Auto sync" }: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" size="sm" variant="outline" disabled={busy || disabled} onClick={onClick}>
      <RefreshCw className={`mr-1.5 size-3.5 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Syncing…" : label}
    </Button>
  );
}

/** Pull a preview image from a public TikTok / Instagram / YouTube post URL. */
function FetchPreviewButton({ url, onFetched }: { url: string; onFetched: (u: string) => void }) {
  const fetchPreview = useServerFn(scrapePostMetrics);
  const [busy, setBusy] = useState(false);

  async function run() {
    const clean = (url ?? "").trim();
    if (!clean) {
      toast.error("Add the post URL first");
      return;
    }
    setBusy(true);
    try {
      const result = await fetchPreview({ data: { url: clean } });
      if (!result.ok) throw new Error(result.error);
      const thumb = result.metrics.thumbnail_url;
      if (!thumb) throw new Error("No preview image available for that link");
      onFetched(thumb);
      toast.success("Preview pulled from link");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't fetch preview");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={busy || !url?.trim()} onClick={run}>
      <RefreshCw className={`mr-1.5 size-3.5 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Fetching…" : "Fetch preview"}
    </Button>
  );
}




function EditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraLinks, setExtraLinks] = useState<SecondaryLink[]>([]);
  const [vibeConfig, setVibeConfig] = useState<VibeCheckConfig | null>(null);
  const [archetype, setArchetype] = useState<{ key: string; kind: "artist" | "brand" } | null>(null);

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
          media: { ...(d.media ?? {}) } as ProfileMedia,
          vibe_tags: ((d.vibe_tags ?? []) as string[]).join(", "),
          total_followers: d.total_followers?.toString() ?? "",
          total_streams: d.total_streams?.toString() ?? "",
          monthly_streams: d.monthly_streams?.toString() ?? "",
          avg_reach: d.avg_reach?.toString() ?? "",
          avg_engagement: d.avg_engagement?.toString() ?? "",
          top_audience_location: d.top_audience_location ?? "",
          flagged_streaming_mismatch: d.flagged_streaming_mismatch ?? false,
          flagged_streaming_reason: d.flagged_streaming_reason ?? "",
        });

        const urls = (d.socials?.extra ?? []) as string[];
        const names = (d.socials?.extra_names ?? []) as string[];
        setExtraLinks(urls.map((url, i) => ({ url, name: names[i] ?? "" })));
      }

      // Resolve the archetype from the member's latest vibe check so it can be
      // shown here and persisted for the public profile page.
      try {
        const [{ data: vibes }, cfg] = await Promise.all([
          supabase
            .from("vibe_check_responses")
            .select("answers, result, created_at")
            .eq("user_id", u.user.id)
            .order("created_at", { ascending: false })
            .limit(1),
          loadVibeCheckConfig().catch(() => DEFAULT_VIBE_CONFIG),
        ]);
        setVibeConfig(cfg);
        const latest = (vibes?.[0] as any) ?? null;
        if (latest?.result === "brand") {
          const scoring: any = calculateBrandVibe(latest.answers ?? {}, cfg);
          const key = scoring?.brandArchetype?.type ? brandArchetypeKeyFromLabel(scoring.brandArchetype.type, cfg) : null;
          if (key) setArchetype({ key, kind: "brand" });
        } else if (latest?.result === "artist") {
          const scoring: any = calculateVibeScore(latest.answers ?? {}, cfg);
          const key = scoring?.primary ? artistArchetypeKeyFromLabel(scoring.primary, cfg) : null;
          if (key) setArchetype({ key, kind: "artist" });
        }
      } catch {
        /* archetype is optional */
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

  function setMedia(k: keyof ProfileMedia, v: string) {
    setForm((f) => ({ ...f, media: { ...f.media, [k]: v } }));
  }

  function addExtra() {
    setExtraLinks((l) => [...l, { url: "", name: "" }]);
  }
  function updateExtra(i: number, patch: Partial<SecondaryLink>) {
    setExtraLinks((l) => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeExtra(i: number) {
    setExtraLinks((l) => l.filter((_, idx) => idx !== i));
  }

  const archetypeLabel = (() => {
    if (!archetype) return "";
    const cfg = vibeConfig ?? DEFAULT_VIBE_CONFIG;
    const opts = archetype.kind === "brand" ? brandArchetypeOptions(cfg) : artistArchetypeOptions(cfg);
    return opts.find((o) => o.key === archetype.key)?.label ?? "";
  })();


  const runSync = useServerFn(runProfileSync);
  const loadUsage = useServerFn(getMyUsage);
  const [fetching, setFetching] = useState<string | null>(null);
  const [fetchedCounts, setFetchedCounts] = useState<{ instagram?: number; tiktok?: number; youtube?: number; twitch?: number; facebook?: number; x?: number }>({});
  const [extraFetched, setExtraFetched] = useState<Record<string, { followers: number | null; streams: number | null }>>({});
  const [spotifyFetched, setSpotifyFetched] = useState<{ followers: number | null; monthly: number | null; total: number | null } | null>(null);
  const [appleFetched, setAppleFetched] = useState<string | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [syncQuota, setSyncQuota] = useState<{ remaining: number; limit: number; resets: string } | null>(null);

  const extraTotals = Object.values(extraFetched).reduce<{ followers: number; streams: number }>(
    (acc, v) => ({ followers: acc.followers + (v.followers ?? 0), streams: acc.streams + (v.streams ?? 0) }),
    { followers: 0, streams: 0 },
  );



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

  function normaliseSocial(platform: SocialPlatform, raw: string) {
    return toProfileUrl(platform, raw);
  }

  /**
   * One metered run. Pass a target to refresh a single input, or "all" to
   * refresh everything connected in one go.
   */
  async function runSyncFor(target: SyncTarget) {
    const socialUrl = (p: SocialPlatform) => normaliseSocial(p, form.socials[p as keyof ProfileSocials] as string ?? "");
    const extraUrls = extraLinks.map((l) => l.url.trim()).filter(Boolean);
    const isAll = target === "all";
    const extraIndex = target.startsWith("extra:") ? Number(target.slice(6)) : -1;

    const payload = {
      instagram_url: isAll || target === "instagram" ? socialUrl("instagram") : null,
      tiktok_url: isAll || target === "tiktok" ? socialUrl("tiktok") : null,
      youtube_url: isAll || target === "youtube" ? socialUrl("youtube") : null,
      twitch_url: isAll || target === "twitch" ? socialUrl("twitch") : null,
      facebook_url: isAll || target === "facebook" ? socialUrl("facebook") : null,
      x_url: isAll || target === "x" ? socialUrl("x") : null,
      spotify_url: isAll || target === "spotify" ? (form.socials.spotify ?? "").trim() || null : null,
      apple_music_url: isAll || target === "apple_music" ? (form.socials.apple_music ?? "").trim() || null : null,
      extra_urls: isAll
        ? extraUrls
        : extraIndex >= 0
          ? [extraLinks[extraIndex]?.url.trim() ?? ""].filter(Boolean)
          : [],
    };

    if (!Object.values(payload).flat().some(Boolean)) {
      toast.error(isAll ? "Add at least one social or streaming link first" : "Add the link first");
      return;
    }
    setFetching(target);
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

      const extras = r.extras ?? [];
      if (extras.length) {
        setExtraFetched((prev) => {
          const next = { ...prev };
          extras.forEach((e) => {
            next[e.url] = { followers: e.followers ?? null, streams: e.streams ?? null };
          });
          return next;
        });
        const extraFollowers = extras.reduce((sum, e) => sum + (e.followers ?? 0), 0);
        if (extraFollowers > 0) parts.push(`extra links: ${extraFollowers.toLocaleString()}`);
      }

      let mismatch: string | null = null;
      const sp = r.spotify;
      if (sp && sp.ok) {
        setSpotifyFetched({
          followers: sp.followers ?? null,
          monthly: sp.monthly_listeners ?? null,
          total: sp.total_streams ?? null,
        });
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
      if (am && am.ok) {
        setAppleFetched(am.name ?? null);
        if (am.name && !isNameMatch(am.name, candidateNames())) {
          mismatch = mismatch ?? `Apple Music artist "${am.name}" does not match profile name.`;
        }
      }
      if (mismatch) {
        setForm((f) => ({ ...f, flagged_streaming_mismatch: true, flagged_streaming_reason: mismatch! }));
        setMismatchWarning(MISMATCH_MESSAGE);
      } else if (isAll) {
        setMismatchWarning(null);
      }

      toast.success(parts.length ? `Synced — ${parts.join(" · ")}` : "Sync finished, but no numbers were returned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setFetching(null);
    }
  }

  const syncAll = () => runSyncFor("all");



  function applyTotalFromFetched() {
    const total =
      (fetchedCounts.instagram ?? 0) +
      (fetchedCounts.tiktok ?? 0) +
      (fetchedCounts.youtube ?? 0) +
      (fetchedCounts.twitch ?? 0) +
      (fetchedCounts.facebook ?? 0) +
      (fetchedCounts.x ?? 0) +
      extraTotals.followers;
    if (total <= 0) {
      toast.error("Fetch at least one social first");
      return;
    }
    set("total_followers", String(total));
    if (extraTotals.streams > 0) {
      const base = Number(form.monthly_streams) || 0;
      set("monthly_streams", String(base + extraTotals.streams));
    }
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
      const v = ((form.socials[k] as string) || "").trim();
      if (v) (cleanSocials as any)[k] = v;
    });
    const cleanExtras = extraLinks.filter((l) => l.url.trim());
    (cleanSocials as any).extra = cleanExtras.map((l) => l.url.trim());
    (cleanSocials as any).extra_names = cleanExtras.map((l) => l.name.trim());

    const cleanMedia: Record<string, string> = {};
    (Object.keys(form.media) as Array<keyof ProfileMedia>).forEach((k) => {
      const v = (form.media[k] ?? "").trim();
      if (v) cleanMedia[k] = v;
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
      media: cleanMedia,
      vibe_tags: form.vibe_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      vibe_archetype_key: archetype?.key ?? null,
      vibe_archetype_kind: archetype?.kind ?? null,
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

              <details className="md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4" open>
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                  Socials &amp; links
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (primary links, plus band / podcast / side project links)
                  </span>
                </summary>
                <div className="grid gap-5 px-4 md:grid-cols-2">
                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Shown on your public profile as @handles.</p>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "instagram"} disabled={!!fetching || !(form.socials.instagram ?? "").trim()} onClick={() => runSyncFor("instagram")} />
                      {fetchedCounts.instagram != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.instagram.toLocaleString()} followers</span> : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tt">TikTok</Label>
                    <Input id="tt" value={form.socials.tiktok ?? ""} onChange={(e) => setSocial("tiktok", e.target.value)} placeholder="@handle or full URL" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "tiktok"} disabled={!!fetching || !(form.socials.tiktok ?? "").trim()} onClick={() => runSyncFor("tiktok")} />
                      {fetchedCounts.tiktok != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.tiktok.toLocaleString()} followers</span> : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sp">Spotify</Label>
                    <Input id="sp" value={form.socials.spotify ?? ""} onChange={(e) => setSocial("spotify", e.target.value)} placeholder="https://open.spotify.com/artist/…" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "spotify"} disabled={!!fetching || !(form.socials.spotify ?? "").trim()} onClick={() => runSyncFor("spotify")} />
                      {spotifyFetched ? (
                        <span className="text-xs text-muted-foreground">
                          {[
                            spotifyFetched.followers != null ? `${spotifyFetched.followers.toLocaleString()} followers` : null,
                            spotifyFetched.monthly != null ? `${spotifyFetched.monthly.toLocaleString()} monthly listeners` : null,
                            spotifyFetched.total != null ? `${spotifyFetched.total.toLocaleString()} total streams` : null,
                          ].filter(Boolean).join(" · ") || "No numbers returned"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Auto-syncs followers, monthly listeners and total streams.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="am">Apple Music</Label>
                    <Input id="am" value={form.socials.apple_music ?? ""} onChange={(e) => setSocial("apple_music", e.target.value)} placeholder="https://music.apple.com/…/artist/…" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "apple_music"} disabled={!!fetching || !(form.socials.apple_music ?? "").trim()} onClick={() => runSyncFor("apple_music")} />
                      {appleFetched ? <span className="text-xs text-muted-foreground">Matched: {appleFetched}</span> : null}
                    </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "youtube"} disabled={!!fetching || !(form.socials.youtube ?? "").trim()} onClick={() => runSyncFor("youtube")} />
                      {fetchedCounts.youtube != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.youtube.toLocaleString()} subscribers</span> : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="twitch">Twitch</Label>
                    <Input id="twitch" value={form.socials.twitch ?? ""} onChange={(e) => setSocial("twitch", e.target.value)} placeholder="@handle or full URL" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "twitch"} disabled={!!fetching || !(form.socials.twitch ?? "").trim()} onClick={() => runSyncFor("twitch")} />
                      {fetchedCounts.twitch != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.twitch.toLocaleString()} followers</span> : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fb">Facebook</Label>
                    <Input id="fb" value={form.socials.facebook ?? ""} onChange={(e) => setSocial("facebook", e.target.value)} placeholder="Page name or full URL" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "facebook"} disabled={!!fetching || !(form.socials.facebook ?? "").trim()} onClick={() => runSyncFor("facebook")} />
                      {fetchedCounts.facebook != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.facebook.toLocaleString()} followers</span> : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="xcom">X</Label>
                    <Input id="xcom" value={form.socials.x ?? ""} onChange={(e) => setSocial("x", e.target.value)} placeholder="@handle or full URL" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncButton busy={fetching === "x"} disabled={!!fetching || !(form.socials.x ?? "").trim()} onClick={() => runSyncFor("x")} />
                      {fetchedCounts.x != null ? <span className="text-xs text-muted-foreground">Fetched: {fetchedCounts.x.toLocaleString()} followers</span> : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="clabel">Other link label</Label>
                    <Input id="clabel" value={form.socials.custom_label ?? ""} onChange={(e) => setSocial("custom_label", e.target.value)} placeholder="e.g. Bandcamp" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="curl">Other link URL</Label>
                    <Input id="curl" value={form.socials.custom_url ?? ""} onChange={(e) => setSocial("custom_url", e.target.value)} placeholder="https://…" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="web">Website</Label>
                    <Input id="web" value={form.socials.website ?? ""} onChange={(e) => setSocial("website", e.target.value)} placeholder="https://…" />
                  </div>

                  <div className="md:col-span-2 space-y-3 rounded-md border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">Extra links (band, podcast, side project)</p>
                      <p className="text-xs text-muted-foreground">
                        Name each link so people know what it is. Followers and streams from these links are
                        included in your totals when you sync.
                      </p>
                    </div>
                    {extraLinks.map((link, i) => {
                      const fetched = extraFetched[link.url.trim()];
                      return (
                        <div key={i} className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                            <Input
                              value={link.name}
                              onChange={(e) => updateExtra(i, { name: e.target.value })}
                              placeholder="Label (e.g. Band)"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) => updateExtra(i, { url: e.target.value })}
                              placeholder="https://…"
                            />
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeExtra(i)}>
                              Remove
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <SyncButton
                              busy={fetching === `extra:${i}`}
                              disabled={!!fetching || !link.url.trim()}
                              onClick={() => runSyncFor(`extra:${i}`)}
                            />
                            {fetched ? (
                              <span className="text-xs text-muted-foreground">
                                {[
                                  fetched.followers != null ? `${fetched.followers.toLocaleString()} followers` : null,
                                  fetched.streams != null ? `${fetched.streams.toLocaleString()} monthly streams` : null,
                                ].filter(Boolean).join(" · ") || "No numbers returned"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    <Button type="button" size="sm" variant="outline" onClick={addExtra}>
                      Add link
                    </Button>
                  </div>

                  <div className="md:col-span-2">
                    <Button type="button" size="sm" variant="outline" onClick={applyTotalFromFetched}>
                      Auto calculate your followers
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">Sums all fetched social counts — including extra links — into Total social audience below. Total fans adds your monthly streams on top.</p>
                  </div>
                </div>
              </details>

              <FeaturedPostsSection media={form.media} setMedia={setMedia} />


              <details className="md:col-span-2 rounded-lg border border-border/60 bg-muted/20 open:pb-4">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                  Vibe check
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(archetype and tags)</span>
                </summary>
                <div className="space-y-4 px-4">
                  <div className="space-y-1.5">
                    <Label>Your archetype</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={archetypeLabel || "Not taken yet"} readOnly disabled />
                      <Button asChild type="button" size="sm" variant="outline">
                        <Link to="/vibe-check">{archetypeLabel ? "Retake" : "Take the vibe check"}</Link>
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Pulled from your latest vibe check and shown on your public profile.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vibetags">Vibe check tags (comma separated)</Label>
                    <Input
                      id="vibetags"
                      value={form.vibe_tags}
                      onChange={(e) => set("vibe_tags", e.target.value)}
                      placeholder="Coffee, Travel, Fitness, Vinyl"
                    />
                  </div>
                </div>
              </details>





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
