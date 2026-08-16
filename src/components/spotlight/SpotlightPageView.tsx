import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Mail, ExternalLink, Mic2, Check, X, Youtube, Twitch, Facebook, Music2 } from "lucide-react";
import { parseDoLine } from "@/lib/dos-donts";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ClipCard } from "@/components/spotlight/ClipCard";
import { SpotlightNotFound } from "@/components/spotlight/SpotlightNotFound";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getSocialEmbed } from "@/lib/social-embed";
import { getClipPosters } from "@/lib/clip-poster.functions";
import { getSpotlightGate, unlockSpotlight, getSpotlightPreview, getSpotlightForMember, registerSpotlightGuestInterest } from "@/lib/spotlight-access.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PartnerLinks = {
  instagram?: string;
  spotify?: string;
  spotifyEmbed?: string;
  contact?: string;
  video1?: string;
  video2?: string;
  video3?: string;
  video1_cover?: string;
  video2_cover?: string;
  video3_cover?: string;
  video4?: string;
  video4_cover?: string;
  photo1?: string;
  photo2?: string;
  photo3?: string;
  photo4?: string;
  tiktok?: string;
  youtube?: string;
  apple_music?: string;
  instagram_extra?: string[];
  tiktok_extra?: string[];
  youtube_extra?: string[];
  spotify_extra?: string[];
  apple_music_extra?: string[];
  twitch?: string;
  facebook?: string;
  x?: string;
  custom_label?: string;
  custom_url?: string;
  twitch_extra?: string[];
  facebook_extra?: string[];
  x_extra?: string[];
  youtube_name?: string;
  apple_music_name?: string;
  youtube_extra_names?: string[];
  section_labels?: Record<string, string>;
  section_order?: string[];
  colour_thumbnails?: boolean;
};

export const SPOTLIGHT_SECTIONS = [
  { key: "host_bio", label: "About the host" },
  { key: "audience", label: "Who's listening" },
  { key: "partnership", label: "Partnership" },
  { key: "eoi", label: "Expressions of interest" },
  { key: "videos", label: "Watch" },
] as const;

function handleLabel(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    return seg.startsWith("@") ? seg : `@${seg}`;
  } catch {
    return url;
  }
}

export type PartnerPage = {
  id: string;
  slug: string;
  section?: string | null;
  type: string;
  headline: string;
  subtitle: string | null;
  intro: string | null;
  host_bio: string | null;
  partnership_pitch: string | null;
  eoi_opportunities: string[];
  dos_donts?: string[] | null;
  audience_segments: string[];
  vibe_tags?: string[] | null;
  links: PartnerLinks;
  published: boolean;
  header_image_url: string | null;
  profile_image_url: string | null;
  total_followers: number | null;
  total_streams: number | null;
  monthly_streams: number | null;
  avg_reach: number | null;
  avg_engagement: number | null;
};

function formatMetric(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

export function SpotlightPageView({ slug, kind }: { slug: string; kind: "spotlight" | "brief" }) {
  const navigate = useNavigate();
  const noun = kind === "brief" ? "brief" : "spotlight";
  const Noun = kind === "brief" ? "Brief" : "Spotlight";
  const [page, setPage] = useState<PartnerPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "gated">("loading");
  const [isPreview, setIsPreview] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [gate, setGate] = useState<{
    headline: string;
    subtitle: string | null;
    header_image_url: string | null;
    code_label: string;
  } | null>(null);
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [posters, setPosters] = useState<Record<string, string | null>>({});

  // Fetch provider poster thumbnails (TikTok) for clips without a manual cover.
  useEffect(() => {
    const l = page?.links ?? {};
    const urls = [l.video1, l.video2, l.video3, l.video4].filter((u): u is string => !!u);
    if (urls.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getClipPosters({ data: { urls } });
        if (!cancelled) {
          const byHref: Record<string, string | null> = {};
          for (const u of urls) {
            const embed = getSocialEmbed(u);
            if (embed) byHref[embed.href] = res.posters[u] ?? null;
          }
          setPosters(byHref);
        }
      } catch {
        /* posters are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("partner_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error || !data) {
        // Admins can preview unpublished drafts.
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          try {
            const prev = await getSpotlightPreview({ data: { slug } });
            if (prev.ok) {
              setPage(prev.page as unknown as PartnerPage);
              setIsPreview(true);
              setStatus("ready");
              return;
            }
          } catch {
            /* not an admin — fall through */
          }
          try {
            const member = await getSpotlightForMember({ data: { slug } });
            if (member.ok) {
              setPage(member.page as unknown as PartnerPage);
              setStatus("ready");
              return;
            }
          } catch {
            /* not a shared member — fall through to the gate */
          }
        }
        const info = await getSpotlightGate({ data: { slug } });
        if (info.gated) {
          setGate({
            headline: info.headline,
            subtitle: info.subtitle,
            header_image_url: info.header_image_url,
            code_label: info.code_label,
          });
          setStatus("gated");
        } else {
          setStatus("missing");
        }
        return;
      }
      const p = data as unknown as PartnerPage;
      const rowKind = (p.section ?? "spotlight") === "brief" ? "brief" : "spotlight";
      if (rowKind !== kind) {
        navigate({
          to: rowKind === "brief" ? "/brief/$slug" : "/spotlight/$slug",
          params: { slug },
          replace: true,
        });
        return;
      }
      setPage(p);
      setStatus("ready");

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: existing } = await supabase
          .from("spotlight_interests" as any)
          .select("id")
          .eq("partner_page_id", p.id)
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (existing) setRegistered(true);
      }
    })();
  }, [slug]);

  async function handleRegister() {
    if (!page) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setGuestOpen(true);
      return;
    }
    setRegistering(true);
    const { error } = await supabase
      .from("spotlight_interests" as any)
      .insert({ partner_page_id: page.id, user_id: u.user.id });
    setRegistering(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setRegistered(true);
    toast.success("Interest registered — we'll be in touch.");
  }

  async function handleGuestRegister() {
    const email = guestEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setRegistering(true);
    try {
      const res = await registerSpotlightGuestInterest({ data: { slug, email } });
      if (!res.ok) throw new Error("Could not register interest");
      setGuestOpen(false);
      setRegistered(true);
      toast.success("Interest registered — we'll be in touch.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not register interest");
    } finally {
      setRegistering(false);
    }
  }


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading {noun}…</p>
        </main>
      </div>
    );
  }

  if (status === "gated" && gate) {
    const submitGate = async (e: React.FormEvent) => {
      e.preventDefault();
      setGateBusy(true);
      setGateError(null);
      try {
        const res = await unlockSpotlight({
          data: { slug, email: gateEmail.trim(), code: gateCode.trim() },
        });
        if (!res.ok) {
          setGateError("That code doesn't look right. Check it and try again.");
          return;
        }
        setPage(res.page as unknown as PartnerPage);
        setStatus("ready");
      } catch {
        setGateError("Something went wrong. Please try again.");
      } finally {
        setGateBusy(false);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-2xl px-4 py-12 md:py-20">
          {gate.header_image_url ? (
            <div className="mb-10 overflow-hidden rounded-2xl border border-border/60" style={{ aspectRatio: "16 / 9" }}>
              <img src={gate.header_image_url} alt={gate.headline} className="size-full object-cover" />
            </div>
          ) : null}
          <Badge variant="outline" className="uppercase tracking-[0.2em]">
            <Mic2 className="mr-1.5 size-3" /> {Noun}
          </Badge>
          {gate.subtitle ? (
            <p className="mt-4 text-sm uppercase tracking-[0.3em] text-muted-foreground">{gate.subtitle}</p>
          ) : null}
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{gate.headline}</h1>
          <p className="mt-3 text-muted-foreground">
            This {noun} is private. Enter your email and the access code you were given to view it.
          </p>

          <form onSubmit={submitGate} className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6">
            <div>
              <label htmlFor="gate-email" className="text-sm font-medium">Email</label>
              <input
                id="gate-email"
                type="email"
                required
                maxLength={255}
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-pink-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="gate-code" className="text-sm font-medium">{gate.code_label}</label>
              <input
                id="gate-code"
                required
                maxLength={120}
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                placeholder="Enter your code"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-pink-accent focus:outline-none"
              />
            </div>
            {gateError && <p className="text-sm text-destructive">{gateError}</p>}
            <Button type="submit" disabled={gateBusy} className="w-full">
              {gateBusy ? "Checking…" : `View ${noun}`}
            </Button>
          </form>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (status === "missing" || !page) return <SpotlightNotFound />;

  const links = page.links ?? {};
  const sectionLabel = (key: string, fallback: string) =>
    (links.section_labels?.[key] ?? "").trim() || fallback;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {isPreview ? (
        <div className="border-b border-border/60 bg-muted/60 px-4 py-2 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Draft preview — visible to admins only
        </div>
      ) : null}
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        {/* Header image (16:9) */}
        {page.header_image_url ? (
          <div className="mb-10 overflow-hidden rounded-2xl border border-border/60" style={{ aspectRatio: "16 / 9" }}>
            <img src={page.header_image_url} alt={page.headline} className="size-full object-cover" />
          </div>
        ) : null}

        {/* Hero */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-start gap-6">
            {page.profile_image_url ? (
              <img
                src={page.profile_image_url}
                alt={page.headline}
                className={`size-28 shrink-0 rounded-xl border border-border/60 object-cover md:size-36 ${links.colour_thumbnails ? "" : "grayscale"}`}
              />
            ) : null}
            <div className="flex-1 space-y-3">
              <Badge variant="outline" className="uppercase tracking-[0.2em]">
                <Mic2 className="mr-1.5 size-3" /> {page.type}
              </Badge>
              {page.subtitle ? (
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{page.subtitle}</p>
              ) : null}
              <h1 className="font-display text-5xl leading-tight md:text-6xl">{page.headline}</h1>
            </div>
          </div>
          {page.intro ? (
            <p className="text-lg text-muted-foreground">{page.intro}</p>
          ) : null}

          {/* Metrics */}
          {(() => {
            const items: Array<{ label: string; value: string }> = [];
            const fans = (page.total_followers ?? 0) + (page.monthly_streams ?? 0);
            const fansLabel = formatMetric(fans);
            if (fansLabel && fans > (page.total_followers ?? 0)) items.push({ label: "Total fans", value: fansLabel });
            const tf = formatMetric(page.total_followers); if (tf) items.push({ label: "Total social audience", value: tf });
            const ms = formatMetric(page.monthly_streams); if (ms) items.push({ label: "Monthly streams", value: ms });
            const ts = formatMetric(page.total_streams); if (ts) items.push({ label: "Total streams", value: ts });
            const ar = formatMetric(page.avg_reach); if (ar) items.push({ label: "Avg. reach", value: ar });
            if (page.avg_engagement != null) items.push({ label: "Avg. engagement", value: `${page.avg_engagement}%` });
            if (items.length === 0) return null;
            return (
              <div className="grid gap-3 pt-2 sm:grid-cols-2 md:grid-cols-3">
                {items.map((m) => (
                  <Card key={m.label} className="border-pink-accent">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
                      <p className="mt-1 font-display text-2xl">{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2 pt-2">

            {links.spotify ? (
              <Button asChild variant="default" size="sm">
                <a href={links.spotify} target="_blank" rel="noreferrer">
                  Listen on Spotify <ExternalLink className="ml-1.5 size-3.5" />
                </a>
              </Button>
            ) : null}
            {links.instagram ? (
              <Button asChild variant="outline" size="sm">
                <a href={links.instagram} target="_blank" rel="noreferrer" aria-label={`Instagram ${handleLabel(links.instagram)}`}>
                  <Instagram className="mr-1.5 size-3.5" />{handleLabel(links.instagram)}
                </a>
              </Button>
            ) : null}
            {([
              { url: links.tiktok, label: "TikTok", abbr: "TT" },
              { url: links.youtube, label: "YouTube", abbr: "YT", Icon: Youtube, name: (links.youtube_name ?? "").trim() },
              { url: links.apple_music, label: "Apple Music", abbr: "AM", Icon: Music2, name: (links.apple_music_name ?? "").trim() },
              { url: links.twitch, label: "Twitch", abbr: "TW", Icon: Twitch },
              { url: links.facebook, label: "Facebook", abbr: "FB", Icon: Facebook },
              { url: links.x, label: "X", abbr: "X" },
              { url: links.custom_url, label: links.custom_label || "Link", abbr: (links.custom_label || "Link").slice(0, 2).toUpperCase() },
            ] as const).map((l) =>
              l.url ? (
                <Button key={l.label} asChild variant="outline" size="sm">
                  <a
                    href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${l.label} ${("name" in l && l.name) || handleLabel(l.url)}`}
                  >
                    {"Icon" in l && l.Icon ? (
                      <l.Icon className="mr-1.5 size-3.5" aria-hidden />
                    ) : (
                      <span className="mr-1.5 text-[0.7rem] font-semibold tracking-wider">{l.abbr}</span>
                    )}
                    {("name" in l && l.name) || handleLabel(l.url)}
                  </a>
                </Button>
              ) : null,
            )}
            {links.contact ? (
              <Button asChild variant="outline" size="sm">
                <a href={links.contact.startsWith("http") ? links.contact : `mailto:${links.contact}`}>
                  <Mail className="mr-1.5 size-3.5" /> Get in touch
                </a>
              </Button>
            ) : null}
          </div>

          {/* Extra handles (band members / side projects) */}
          {(() => {
            const ytNames = links.youtube_extra_names ?? [];
            const groups: Array<{ label: string; abbr: string; Icon?: typeof Instagram; urls: string[]; names?: string[] }> = [
              { label: "Instagram", abbr: "IG", Icon: Instagram, urls: links.instagram_extra ?? [] },
              { label: "TikTok", abbr: "TT", urls: links.tiktok_extra ?? [] },
              { label: "YouTube", abbr: "YT", Icon: Youtube, urls: links.youtube_extra ?? [], names: ytNames },
              { label: "Spotify", abbr: "SP", Icon: Music2, urls: links.spotify_extra ?? [] },
              { label: "Apple Music", abbr: "AM", Icon: Music2, urls: links.apple_music_extra ?? [] },
              { label: "Twitch", abbr: "TW", Icon: Twitch, urls: links.twitch_extra ?? [] },
              { label: "Facebook", abbr: "FB", Icon: Facebook, urls: links.facebook_extra ?? [] },
              { label: "X", abbr: "X", urls: links.x_extra ?? [] },
            ].filter((g) => g.urls.length > 0);
            if (groups.length === 0) return null;
            return (
              <div className="space-y-2 pt-3">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {sectionLabel("members", "Meet the members")}
                </p>
                <div className="flex flex-wrap gap-2">
                {groups.flatMap((g) =>
                  g.urls.map((u, i) => {
                    const display = (g.names?.[i] ?? "").trim() || handleLabel(u);
                    return (
                    <Button key={`${g.label}-${u}`} asChild variant="outline" size="sm">
                      <a
                        href={u.startsWith("http") ? u : `https://${u}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${g.label} ${display}`}
                      >
                        {g.Icon ? (
                          <g.Icon className="mr-1.5 size-3.5" aria-hidden />
                        ) : (
                          <span className="mr-1.5 text-[0.7rem] font-semibold tracking-wider">{g.abbr}</span>
                        )}
                        {display}
                      </a>
                    </Button>
                    );
                  }),
                )}
                </div>
              </div>
            );
          })()}

        </section>

        {(() => {
          const nodes: Record<string, React.ReactNode> = {
            /* Host bio */
            host_bio: page.host_bio ? (
              <section className="mt-16">
                <h2 className="font-display text-3xl">{sectionLabel("host_bio", "About the host")}</h2>
                <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{page.host_bio}</p>
              </section>
            ) : null,

            /* Audience */
            audience: page.audience_segments?.length ? (
              <section className="mt-16">
                <h2 className="font-display text-3xl">{sectionLabel("audience", "Who's listening")}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {page.audience_segments.map((seg, i) => (
                    <Card key={i}>
                      <CardContent className="p-5 text-sm">{seg}</CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null,

            /* Spotify embed */
            spotify: links.spotifyEmbed ? (
              <section className="mt-10">
                <iframe
                  src={links.spotifyEmbed}
                  width="100%"
                  height="152"
                  frameBorder={0}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block rounded-xl"
                  title="Spotify player"
                />
              </section>
            ) : null,

            /* Partnership pitch */
            partnership: page.partnership_pitch ? (
              <section className="mt-16">
                <h2 className="font-display text-3xl">{sectionLabel("partnership", "Partnership")}</h2>
                <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{page.partnership_pitch}</p>
              </section>
            ) : null,

            /* Vibe check */
            vibe_check: page.vibe_tags?.length ? (
              <section className="mt-10">
                <h2 className="font-display text-3xl">{sectionLabel("vibe_check", "Vibe check")}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {page.vibe_tags.map((tag, i) => (
                    <span
                      key={i}
                      className="cursor-default rounded-full border border-border px-4 py-1.5 text-sm text-foreground/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null,

            /* Dos and don'ts */
            dos_donts: page.dos_donts?.length ? (
              <section className="mt-10">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">{sectionLabel("dos_donts", "Dos and don'ts")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {page.dos_donts.map((raw, i) => {
                        const item = parseDoLine(raw);
                        if (!item.text) return null;
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            {item.kind === "do" ? (
                              <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                            ) : (
                              <X className="mt-0.5 size-4 shrink-0 text-yellow-400" />
                            )}
                            <span>{item.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            ) : null,

            /* EOI */
            eoi: page.eoi_opportunities?.length ? (
              <section className="mt-10">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">{sectionLabel("eoi", "Expressions of interest")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {page.eoi_opportunities.map((eoi, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="size-1.5 rounded-full bg-primary" /> {eoi}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button onClick={handleRegister} disabled={registering || registered}>
                        {registered ? (
                          <><Check className="mr-1.5 size-4" /> Interest registered</>
                        ) : registering ? "Registering…" : "Register interest"}
                      </Button>
                      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-display text-xl">Register your interest</DialogTitle>
                            <DialogDescription>
                              Pop in your email and we'll be in touch about this opportunity.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-1.5">
                            <Label htmlFor="guest-email">Email</Label>
                            <Input
                              id="guest-email"
                              type="email"
                              maxLength={255}
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              placeholder="you@example.com"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By entering your email, you are giving Racket permission to contact you about this
                            collab and partnership opportunity.
                          </p>
                          <DialogFooter>
                            <Button onClick={handleGuestRegister} disabled={registering}>
                              {registering ? "Registering…" : "Register interest"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {links.contact ? (
                        <Button asChild variant="outline">
                          <a href={links.contact.startsWith("http") ? links.contact : `mailto:${links.contact}`}>
                            <Mail className="mr-1.5 size-4" /> Contact directly
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : null,

            /* Videos */
            videos: (() => {
              const raw: Array<{ url?: string; cover?: string }> = [
                { url: links.video1, cover: links.video1_cover },
                { url: links.video2, cover: links.video2_cover },
                { url: links.video3, cover: links.video3_cover },
                { url: links.video4, cover: links.video4_cover },
              ];
              const videos = raw
                .map((v) => {
                  const embed = v.url ? getSocialEmbed(v.url) : null;
                  return embed ? { embed, cover: v.cover } : null;
                })
                .filter((v): v is { embed: NonNullable<ReturnType<typeof getSocialEmbed>>; cover: string | undefined } => !!v);
              if (videos.length === 0) return null;
              return (
                <section className="mt-16">
                  <h2 className="font-display text-3xl">{sectionLabel("videos", "Watch")}</h2>
                  <div className={`mt-4 grid gap-3 sm:gap-6 ${videos.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "md:grid-cols-3"}`}>
                    {videos.map((v, i) => (
                      <ClipCard
                        key={i}
                        href={v.embed.href}
                        provider={v.embed.provider}
                        poster={v.cover ?? posters[v.embed.href] ?? null}
                      />
                    ))}
                  </div>
                </section>
              );
            })(),

            /* Photos */
            photos: (() => {
              const photos = [links.photo1, links.photo2, links.photo3, links.photo4].filter(
                (u): u is string => !!u && u.trim().length > 0,
              );
              if (photos.length === 0) return null;
              return (
                <section className="mt-12">
                  <div
                    className={`grid gap-3 sm:gap-6 ${photos.length >= 4 ? "grid-cols-2 md:grid-cols-4" : photos.length === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}
                  >
                    {photos.map((src, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-3xl border border-border/60 bg-muted/40"
                        style={{ aspectRatio: "4 / 5" }}
                      >
                        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })(),
          };

          const defaults = [
            "host_bio",
            "audience",
            "spotify",
            "partnership",
            "vibe_check",
            "dos_donts",
            "eoi",
            "videos",
            "photos",
          ];
          const given = (links.section_order ?? []).filter((k) => defaults.includes(k));
          const order = [...given, ...defaults.filter((k) => !given.includes(k))];
          return order.map((k) => (nodes[k] ? <div key={k}>{nodes[k]}</div> : null));
        })()}
      </main>
      <SiteFooter />
    </div>
  );
}
