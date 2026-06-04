import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Users, ClipboardList, UserCircle2, ArrowRight } from "lucide-react";
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
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileRow, setProfileRow] = useState<{ slug: string | null; avatar_url: string | null; bio: string | null; display_name: string | null } | null>(null);
  const [latestVibe, setLatestVibe] = useState<VibeRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [community, setCommunity] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? null);
      if (!u.user) return;

      // Auto-enrol new accounts into the mailing list
      if (u.user.email) {
        const { data: existing } = await supabase
          .from("mailing_list_subscribers")
          .select("id")
          .eq("email", u.user.email)
          .maybeSingle();
        if (!existing) {
          await supabase.from("mailing_list_subscribers").insert({
            email: u.user.email,
            name: u.user.user_metadata?.full_name ?? u.user.user_metadata?.name ?? null,
            source: "account-creation",
            marketing_opt_in: true,
          });
        }
      }

      const [{ data: vibes }, { data: rosterRows }, { data: communityRows }, { data: featuredRows }, { data: profile }] = await Promise.all([
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
        (supabase as any)
          .from("public_profiles")
          .select("id, display_name, artist_name, account_type, bio, location, avatar_url")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("profiles")
          .select("display_name, slug, avatar_url, bio")
          .eq("id", u.user.id)
          .single(),
      ]);

      setDisplayName(profile?.display_name ?? null);
      setProfileRow((profile as any) ?? null);
      setLatestVibe((vibes?.[0] as VibeRow) ?? null);
      const featuredMembers: CommunityMember[] = ((featuredRows ?? []) as any[]).map((p) => ({
        id: p.id,
        display_name: p.artist_name || p.display_name || "Member",
        account_type: (p.account_type ?? "artist") as CommunityMember["account_type"],
        tagline: p.bio ?? null,
        location: p.location ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
      setCommunity([...featuredMembers, ...((communityRows as CommunityMember[]) ?? [])].slice(0, 12));

      if (rosterRows && rosterRows.length) {
        const memberIds = rosterRows.map((r) => r.member_id);
        const { data: profilesData } = await (supabase as any)
          .from("public_profiles")
          .select("id, display_name, avatar_url")
          .in("id", memberIds);
        const profiles = (profilesData ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
        const byId = new Map(profiles.map((p) => [p.id, p]));
        setRoster(
          rosterRows.map((r) => ({ ...r, member: byId.get(r.member_id) ?? null }))
        );
      } else {
        setRoster([]);
      }
      setLoading(false);
    })();
  }, []);

  // Live-update the suggested matches when an admin edits community profiles
  useEffect(() => {
    const channel = supabase
      .channel("community_profiles_dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_profiles" },
        async () => {
          const { data } = await supabase
            .from("community_profiles")
            .select("id, display_name, account_type, tagline, location, avatar_url")
            .order("created_at", { ascending: false })
            .limit(8);
          setCommunity((data as CommunityMember[]) ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
              {displayName ?? email ?? "Your dashboard"}
            </h1>
          </div>
        </div>

        <SetupChecklist
          loading={loading}
          hasVibe={!!latestVibe}
          profileComplete={!!profileRow?.slug && !!profileRow?.avatar_url && !!(profileRow?.display_name || displayName) && !!profileRow?.bio}
          hasSlug={!!profileRow?.slug}
          hasAvatar={!!profileRow?.avatar_url}
          hasBio={!!profileRow?.bio}
        />



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
                <Link to="/profile">
                  <UserCircle2 className="mr-2 size-4" /> Edit your profile
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
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
                    {latestVibe ? (
                      <p className="text-muted-foreground">
                        Your roster is empty. Community browsing is coming soon — we'll start
                        surfacing matches based on your Vibe Check results here.
                      </p>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          Your roster is empty. Take the Vibe Check to start surfacing matches.
                        </p>
                        <Button asChild className="mt-4">
                          <Link to="/vibe-check">Take the Vibe Check</Link>
                        </Button>
                      </>
                    )}
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

  return (
    <Card className="lg:h-full">

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
      </CardContent>
    </Card>
  );
}


function SetupChecklist({
  loading,
  hasVibe,
  profileComplete,
  hasSlug,
  hasAvatar,
  hasBio,
}: {
  loading: boolean;
  hasVibe: boolean;
  profileComplete: boolean;
  hasSlug: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
}) {
  if (loading) return null;
  if (profileComplete && hasVibe) return null;

  const items: Array<{ done: boolean; label: string; cta: string; to: "/profile" | "/vibe-check" }> = [];
  if (!hasAvatar) items.push({ done: false, label: "Add a profile photo", cta: "Upload photo", to: "/profile" });
  if (!hasBio) items.push({ done: false, label: "Write a short bio", cta: "Add bio", to: "/profile" });
  if (!hasSlug) items.push({ done: false, label: "Claim your /u/ URL so people can find you", cta: "Pick a URL", to: "/profile" });
  if (!hasVibe) items.push({ done: false, label: "Take the Vibe Check to unlock matches", cta: "Take Vibe Check", to: "/vibe-check" });

  if (items.length === 0) return null;
  const primary = items[0];

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <CardTitle className="font-display text-2xl">Finish setting up your profile</CardTitle>
        </div>
        <CardDescription>
          A complete profile plus your Vibe Check is how brands and collaborators find you. Just a couple of quick steps left.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-3 text-sm">
              <span className="grid size-5 place-items-center rounded-full border border-border/60 bg-background">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              </span>
              <span className="flex-1">{it.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link to={primary.to}>{primary.cta} <ArrowRight className="ml-1.5 size-3.5" /></Link>
          </Button>
          {items.length > 1 ? (
            <Button asChild size="sm" variant="ghost">
              <Link to={items[items.length - 1].to}>{items[items.length - 1].cta}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
