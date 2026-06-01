import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Sparkles, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateVibeScore,
  calculateBrandVibe,
  getArtistArchetypeDescription,
} from "@/lib/vibe-check";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Create Racket" }],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Couldn't load dashboard: {error.message}</div>
  ),
});

type VibeRow = {
  id: string;
  created_at: string;
  result: "artist" | "brand" | "fan" | null;
  answers: any;
  artist_score: number;
  brand_score: number;
};

type RosterRow = {
  id: string;
  member_id: string;
  created_at: string;
  member?: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

type CommunityMember = {
  id: string;
  display_name: string;
  account_type: "artist" | "brand" | "fan";
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [latestVibe, setLatestVibe] = useState<VibeRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [community, setCommunity] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? null);
      if (!u.user) return;

      const [{ data: vibes }, { data: rosterRows }, { data: communityRows }] = await Promise.all([
        supabase
          .from("vibe_check_responses")
          .select("id, created_at, result, answers, artist_score, brand_score")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("roster_members")
          .select("id, member_id, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("community_profiles")
          .select("id, display_name, account_type, tagline, location, avatar_url")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setLatestVibe((vibes?.[0] as VibeRow) ?? null);
      setCommunity((communityRows as CommunityMember[]) ?? []);

      if (rosterRows && rosterRows.length) {
        const memberIds = rosterRows.map((r) => r.member_id);
        const { data: profiles } = await supabase
          .from("public_profiles" as any)
          .select("id, display_name, avatar_url")
          .in("id", memberIds);
        const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
        setRoster(
          rosterRows.map((r) => ({ ...r, member: byId.get(r.member_id) ?? null }))
        );
      } else {
        setRoster([]);
      }
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function removeFromRoster(id: string) {
    const { error } = await supabase.from("roster_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRoster((r) => r.filter((x) => x.id !== id));
    toast.success("Removed from roster");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">
              {email ?? "Your dashboard"}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1 size-4" /> Sign out
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* VIBE CARD (spans 2) */}
          <div className="lg:col-span-2">
            <VibeCard loading={loading} vibe={latestVibe} />
          </div>

          {/* QUICK ACTIONS */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link to="/connect">
                  <ClipboardList className="mr-2 size-4" /> Submit a brief
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/vibe-check">
                  <Sparkles className="mr-2 size-4" /> Retake the Vibe Check
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/contact">
                  <ClipboardList className="mr-2 size-4" /> Contact the team
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* ROSTER (full width) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Users className="size-5 text-primary" /> Your roster
                </CardTitle>
                <CardDescription>
                  Artists, brands and creators you've saved. Add people from the community
                  to keep your shortlist in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : roster.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                    <p className="text-muted-foreground">
                      Your roster is empty. Community browsing is coming soon — for now,
                      take the Vibe Check to start surfacing matches.
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/vibe-check">Take the Vibe Check</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {roster.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 overflow-hidden rounded-full bg-muted">
                            {r.member?.avatar_url ? (
                              <img
                                src={r.member.avatar_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <div className="font-medium">
                              {r.member?.display_name ?? "Member"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Added {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromRoster(r.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SUGGESTED MATCHES (community) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> Suggested matches
                </CardTitle>
                <CardDescription>
                  A taste of who's on Create Racket — sample artists and brands to give you a feel
                  for the kind of matches we'll surface as the community grows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : community.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No community members yet.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {community.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 overflow-hidden rounded-full bg-muted">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{m.display_name}</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">
                              {m.account_type}
                            </div>
                          </div>
                        </div>
                        {m.tagline ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{m.tagline}</p>
                        ) : null}
                        {m.location ? (
                          <p className="text-xs text-muted-foreground">{m.location}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function VibeCard({ loading, vibe }: { loading: boolean; vibe: VibeRow | null }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Your Vibe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (!vibe) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Your Vibe</CardTitle>
          <CardDescription>
            You haven't taken the Vibe Check yet. Takes about 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/vibe-check">Take the Vibe Check</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isBrand = vibe.result === "brand";
  const scoring = isBrand
    ? calculateBrandVibe(vibe.answers ?? {})
    : calculateVibeScore(vibe.answers ?? {});

  const headline = isBrand
    ? (scoring as any).brandArchetype?.type
    : (scoring as any).primary;
  const description = isBrand
    ? (scoring as any).brandArchetype?.description
    : getArtistArchetypeDescription((scoring as any).primary);
  const bars: { label: string; score: number }[] = isBrand
    ? ((scoring as any).artistMatches ?? []).slice(0, 5).map((m: any) => ({
        label: m.archetype,
        score: m.score,
      }))
    : ((scoring as any).sortedScores ?? []).map((s: any) => ({
        label: s.archetype,
        score: s.score,
      }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {isBrand ? "Brand archetype" : "Artist archetype"}
            </p>
            <CardTitle className="mt-1 font-display text-3xl">
              <span className="text-gradient-racket">{headline}</span>
            </CardTitle>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/vibe-check">Retake</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground">{description}</p>
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <span className="text-muted-foreground">{Math.round(b.score)}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, b.score))}%`,
                    background: "linear-gradient(90deg, var(--primary), var(--coral))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
