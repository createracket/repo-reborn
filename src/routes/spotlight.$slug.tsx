import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Mail, ExternalLink, Mic2 } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type PartnerLinks = {
  instagram?: string;
  spotify?: string;
  spotifyEmbed?: string;
  contact?: string;
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
};

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
  const [page, setPage] = useState<PartnerPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("partner_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error || !data) {
        setStatus("missing");
        return;
      }
      setPage(data as unknown as PartnerPage);
      setStatus("ready");
    })();
  }, [slug]);

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
            <p className="max-w-2xl text-lg text-muted-foreground">{page.intro}</p>
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
                  <Instagram className="mr-1.5 size-3.5" /> Instagram
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
                {links.contact ? (
                  <Button asChild className="mt-6">
                    <a href={links.contact.startsWith("http") ? links.contact : `mailto:${links.contact}`}>
                      Register interest
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="mt-6"><Link to="/contact">Register interest</Link></Button>
                )}
              </CardContent>
            </Card>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
