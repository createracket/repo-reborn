import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Mail, ExternalLink, Mic2, Check } from "lucide-react";
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
import { getSpotlightGate, unlockSpotlight, getSpotlightPreview } from "@/lib/spotlight-access.functions";

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
};

function handleLabel(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    return seg.startsWith("@") ? seg : `@${seg}`;
  } catch {
    return url;
  }
}

type PartnerPage = {
  id: string;
  slug: string;
  type: string;
  headline: string;
  subtitle: string | null;
  intro: string | null;
  host_bio: string | null;
  partnership_pitch: string | null;
  eoi_opportunities: string[];
  audience_segments: string[];
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

export const Route = createFileRoute("/spotlight/$slug")({
  // Partner pages are deliberately not indexable.
  head: ({ loaderData }) => {
    const p = loaderData as PartnerPage | undefined;
    const title = p ? `${p.headline} — Spotlight` : "Spotlight";
    return {
      meta: [
        { title },
        { name: "robots", content: "noindex, nofollow" },
        { name: "description", content: p?.subtitle ?? "Partner spotlight." },
      ],
    };
  },
  component: SpotlightPage,
  notFoundComponent: SpotlightNotFound,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </main>
      <SiteFooter />
    </div>
  ),
});


function SpotlightPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<PartnerPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "gated">("loading");
  const [isPreview, setIsPreview] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
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
    const urls = [l.video1, l.video2, l.video3].filter((u): u is string => !!u);
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
    setRegistering(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.info("Sign in to register your interest");
      navigate({ to: "/login" });
      return;
    }
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


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading spotlight…</p>
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
            <Mic2 className="mr-1.5 size-3" /> Spotlight
          </Badge>
          {gate.subtitle ? (
            <p className="mt-4 text-sm uppercase tracking-[0.3em] text-muted-foreground">{gate.subtitle}</p>
          ) : null}
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{gate.headline}</h1>
          <p className="mt-3 text-muted-foreground">
            This spotlight is private. Enter your email and the access code you were given to view it.
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
              {gateBusy ? "Checking…" : "View spotlight"}
            </Button>
          </form>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (status === "missing" || !page) return <SpotlightNotFound />;

  const links = page.links ?? {};

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
                className="size-28 shrink-0 rounded-xl border border-border/60 object-cover grayscale md:size-36"
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
                <a href={links.instagram} target="_blank" rel="noreferrer">
                  <Instagram className="mr-1.5 size-3.5" />Instagram
                </a>
              </Button>
            ) : null}
            {([
              { url: links.twitch, label: "Twitch" },
              { url: links.facebook, label: "Facebook" },
              { url: links.x, label: "X" },
              { url: links.custom_url, label: links.custom_label || "Link" },
            ] as const).map((l) =>
              l.url ? (
                <Button key={l.label} asChild variant="outline" size="sm">
                  <a href={l.url.startsWith("http") ? l.url : `https://${l.url}`} target="_blank" rel="noreferrer">
                    {l.label}
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
            const groups: Array<{ label: string; urls: string[] }> = [
              { label: "Instagram", urls: links.instagram_extra ?? [] },
              { label: "TikTok", urls: links.tiktok_extra ?? [] },
              { label: "YouTube", urls: links.youtube_extra ?? [] },
              { label: "Spotify", urls: links.spotify_extra ?? [] },
              { label: "Apple Music", urls: links.apple_music_extra ?? [] },
              { label: "Twitch", urls: links.twitch_extra ?? [] },
              { label: "Facebook", urls: links.facebook_extra ?? [] },
              { label: "X", urls: links.x_extra ?? [] },
            ].filter((g) => g.urls.length > 0);
            if (groups.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 pt-1">
                {groups.flatMap((g) =>
                  g.urls.map((u) => (
                    <Button key={`${g.label}-${u}`} asChild variant="outline" size="sm">
                      <a href={u.startsWith("http") ? u : `https://${u}`} target="_blank" rel="noreferrer">
                        {g.label} · {handleLabel(u)}
                      </a>
                    </Button>
                  )),
                )}
              </div>
            );
          })()}
        </section>

        {/* Metrics */}
        {(() => {
          const items: Array<{ label: string; value: string }> = [];
          const tf = formatMetric(page.total_followers); if (tf) items.push({ label: "Total social audience", value: tf });
          const fans = (page.total_followers ?? 0) + (page.monthly_streams ?? 0);
          const fansLabel = formatMetric(fans);
          if (fansLabel && fans > (page.total_followers ?? 0)) items.push({ label: "Total fans", value: fansLabel });
          const ts = formatMetric(page.total_streams); if (ts) items.push({ label: "Total streams", value: ts });
          const ms = formatMetric(page.monthly_streams); if (ms) items.push({ label: "Monthly streams", value: ms });
          const ar = formatMetric(page.avg_reach); if (ar) items.push({ label: "Avg. reach", value: ar });
          if (page.avg_engagement != null) items.push({ label: "Avg. engagement", value: `${page.avg_engagement}%` });
          if (items.length === 0) return null;
          return (
            <section className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {items.map((m) => (
                <Card key={m.label}>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="mt-1 font-display text-2xl">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          );
        })()}

        {/* Spotify embed */}
        {links.spotifyEmbed ? (
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
        ) : null}


        {/* Host bio */}
        {page.host_bio ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl">About the host</h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{page.host_bio}</p>
          </section>
        ) : null}

        {/* Audience */}
        {page.audience_segments?.length ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl">Who's listening</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {page.audience_segments.map((seg, i) => (
                <Card key={i}>
                  <CardContent className="p-5 text-sm">{seg}</CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* Partnership pitch */}
        {page.partnership_pitch ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl">Partnership</h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{page.partnership_pitch}</p>
          </section>
        ) : null}

        {/* EOI */}
        {page.eoi_opportunities?.length ? (
          <section className="mt-10">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl">Expressions of interest</CardTitle>
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
        ) : null}
        {/* Videos */}
        {(() => {
          const raw: Array<{ url?: string; cover?: string }> = [
            { url: links.video1, cover: links.video1_cover },
            { url: links.video2, cover: links.video2_cover },
            { url: links.video3, cover: links.video3_cover },
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
              <h2 className="font-display text-3xl">Watch</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
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
        })()}
      </main>
      <SiteFooter />
    </div>
  );
}
