import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, Globe, Music2, Youtube } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type PublicProfile = {
  id: string;
  slug: string;
  display_name: string | null;
  artist_name: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  socials: Record<string, string> | null;
  total_followers: number | null;
  total_streams: number | null;
  monthly_streams: number | null;
  avg_reach: number | null;
  avg_engagement: number | null;
  top_audience_location: string | null;
};

export const Route = createFileRoute("/u/$slug")({
  head: ({ loaderData }) => {
    const p = loaderData as PublicProfile | undefined;
    const name = p?.artist_name || p?.display_name || "Profile";
    return {
      meta: [
        { title: `${name} — Create Racket` },
        { name: "description", content: p?.bio?.slice(0, 160) ?? `${name} on Create Racket.` },
      ],
    };
  },
  component: PublicProfilePage,
});

function formatNumber(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function normalizeUrl(v: string, fallbackBase?: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@") && fallbackBase) return `${fallbackBase}${v.slice(1)}`;
  if (fallbackBase) return `${fallbackBase}${v}`;
  return v;
}

function PublicProfilePage() {
  const { slug } = Route.useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("public_profiles")
        .select("id, slug, display_name, artist_name, location, bio, avatar_url, socials, total_followers, total_streams, monthly_streams, avg_reach, avg_engagement, top_audience_location")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        setStatus("missing");
        return;
      }
      setProfile(data as unknown as PublicProfile);
      setStatus("ready");
    })();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (status === "missing" || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl">Profile not found</h1>
          <p className="mt-2 text-muted-foreground">This profile may not exist or isn't public yet.</p>
          <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const socials = profile.socials ?? {};
  const metrics: Array<{ label: string; value: string }> = [];
  const f = formatNumber(profile.total_followers); if (f) metrics.push({ label: "Total social audience", value: f });
  const fans = (profile.total_followers ?? 0) + (profile.monthly_streams ?? 0);
  const fansLabel = formatNumber(fans);
  if (fansLabel && fans > (profile.total_followers ?? 0)) metrics.push({ label: "Total fans", value: fansLabel });
  const ts = formatNumber(profile.total_streams); if (ts) metrics.push({ label: "Total streams", value: ts });
  const ms = formatNumber(profile.monthly_streams); if (ms) metrics.push({ label: "Monthly streams", value: ms });
  const ar = formatNumber(profile.avg_reach); if (ar) metrics.push({ label: "Avg. reach", value: ar });
  if (profile.avg_engagement != null) metrics.push({ label: "Avg. engagement", value: `${profile.avg_engagement}%` });
  if (profile.top_audience_location) metrics.push({ label: "Top audience", value: profile.top_audience_location });

  const socialLinks = [
    { key: "instagram", icon: Instagram, label: "Instagram", base: "https://instagram.com/" },
    { key: "tiktok", icon: Music2, label: "TikTok", base: "https://www.tiktok.com/@" },
    { key: "spotify", icon: Music2, label: "Spotify", base: undefined },
    { key: "youtube", icon: Youtube, label: "YouTube", base: undefined },
    { key: "twitch", icon: Twitch, label: "Twitch", base: "https://twitch.tv/" },
    { key: "facebook", icon: Facebook, label: "Facebook", base: "https://facebook.com/" },
    { key: "x", icon: Globe, label: "X", base: "https://x.com/" },
    { key: "custom_url", icon: LinkIcon, label: (socials as Record<string, string>)["custom_label"] || "Link", base: undefined },
    { key: "website", icon: Globe, label: "Website", base: undefined },
  ].map((s) => ({ ...s, value: (socials as any)[s.key] as string | undefined }))
   .filter((s) => s.value);

  const displayName = profile.artist_name || profile.display_name || "Anonymous";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
        <section className="flex flex-wrap items-center gap-6">
          <div className="size-28 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted md:size-36">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-display text-4xl leading-tight md:text-5xl">{displayName}</h1>
            {profile.display_name && profile.artist_name && profile.display_name !== profile.artist_name ? (
              <p className="text-sm text-muted-foreground">{profile.display_name}</p>
            ) : null}
            {profile.location ? (
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{profile.location}</p>
            ) : null}
          </div>
        </section>

        {profile.bio ? (
          <p className="mt-8 whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
        ) : null}

        {socialLinks.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {socialLinks.map((s) => {
              const Icon = s.icon;
              return (
                <Button key={s.key} asChild variant="outline" size="sm">
                  <a href={normalizeUrl(s.value!, s.base)} target="_blank" rel="noreferrer">
                    <Icon className="mr-1.5 size-3.5" /> {s.label}
                  </a>
                </Button>
              );
            })}
          </div>
        ) : null}

        {metrics.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl">Key metrics</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {metrics.map((m) => (
                <Card key={m.label}>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="mt-1 font-display text-2xl">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
