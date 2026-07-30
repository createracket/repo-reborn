import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Mail, ExternalLink, Mic2, Check } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getSocialEmbed } from "@/lib/social-embed";

type PartnerLinks = {
  instagram?: string;
  spotify?: string;
  spotifyEmbed?: string;
  contact?: string;
  video1?: string;
  video2?: string;
  video3?: string;
};

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
  notFoundComponent: NotFound,
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

function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Spotlight not found</h1>
        <p className="mt-2 text-muted-foreground">This page may be unpublished or doesn't exist.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </main>
      <SiteFooter />
    </div>
  );
}

function SpotlightPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<PartnerPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "gated">("loading");
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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("partner_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error || !data) {
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

  if (status === "missing" || !page) return <NotFound />;

  const links = page.links ?? {};

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
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
                className="size-28 shrink-0 rounded-xl border border-border/60 object-cover md:size-36"
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
            {links.contact ? (
              <Button asChild variant="outline" size="sm">
                <a href={links.contact.startsWith("http") ? links.contact : `mailto:${links.contact}`}>
                  <Mail className="mr-1.5 size-3.5" /> Get in touch
                </a>
              </Button>
            ) : null}
          </div>
        </section>

        {/* Metrics */}
        {(() => {
          const items: Array<{ label: string; value: string }> = [];
          const tf = formatMetric(page.total_followers); if (tf) items.push({ label: "Total followers", value: tf });
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
          <section className="mt-12">
            <iframe
              src={links.spotifyEmbed}
              width="100%"
              height="232"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
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
          const videos = [links.video1, links.video2, links.video3]
            .map((u) => (u ? getSocialEmbed(u) : null))
            .filter((x): x is NonNullable<ReturnType<typeof getSocialEmbed>> => !!x);
          if (videos.length === 0) return null;
          return (
            <section className="mt-16">
              <h2 className="font-display text-3xl">Watch</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {videos.map((v, i) => {
                  const isIg = v.provider === "instagram";
                  return (
                    <div
                      key={i}
                      className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40"
                      style={{ aspectRatio: "9 / 16" }}
                    >
                      <iframe
                        src={v.src}
                        title={`${v.provider} video ${i + 1}`}
                        frameBorder={0}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        scrolling="no"
                        className={isIg ? "absolute left-1/2 -translate-x-1/2" : "size-full"}
                        // Instagram embed has ~56px header and ~160px caption/footer.
                        // Oversize + offset to crop white chrome, keeping only the media.
                        style={
                          isIg
                            ? {
                                top: "-56px",
                                width: "100%",
                                height: "calc(100% + 220px)",
                              }
                            : undefined
                        }
                      />
                      {isIg && (
                        <a
                          href={v.href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open on Instagram"
                          className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur hover:bg-black/70"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}
      </main>
      <SiteFooter />
    </div>
  );
}
