import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateVibeScore,
  calculateBrandVibe,
  getArtistArchetypeDescription,
} from "@/lib/vibe-check";
import { loadVibeCheckConfig, DEFAULT_VIBE_CONFIG, type VibeCheckConfig } from "@/lib/vibe-check-config";

type Stored =
  | { flow: "musician"; data: any; at: number }
  | { flow: "brand"; data: any; at: number };

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your Vibe — Create Racket" },
      { name: "description", content: "Your Vibe Check results." },
    ],
  }),
  component: Results,
});

function Results() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [config, setConfig] = useState<VibeCheckConfig>(DEFAULT_VIBE_CONFIG);
  const savedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vibeCheck");
      if (raw) setStored(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);

    loadVibeCheckConfig().then(setConfig).catch(() => {});

    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-save once when both a result and a session are available.
  useEffect(() => {
    if (!stored || !signedIn || savedRef.current) return;
    savedRef.current = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const scoring =
        stored.flow === "musician"
          ? calculateVibeScore(stored.data, config)
          : calculateBrandVibe(stored.data, config);
      const payload =
        stored.flow === "musician"
          ? {
              user_id: u.user.id,
              answers: stored.data,
              result: "artist" as const,
              artist_score: (scoring as any).sortedScores?.[0]?.score ?? 0,
              brand_score: 0,
            }

          : {
              user_id: u.user.id,
              answers: stored.data,
              result: "brand" as const,
              artist_score: 0,
              brand_score: (scoring as any).brandArchetype?.score ?? 0,
            };
      const { error } = await supabase.from("vibe_check_responses").insert(payload as any);
      if (!error) toast.success("Saved to your dashboard.");
    })();
  }, [stored, signedIn, config]);


  if (!loaded) return null;

  if (!stored) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl">No vibe to check yet</h1>
          <p className="mt-3 text-muted-foreground">
            Take the Vibe Check first and we'll show your archetype here.
          </p>
          <Button asChild className="mt-6">
            <Link to="/vibe-check">Take the Vibe Check</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:py-20">
        {stored.flow === "musician" ? (
          <MusicianResults data={stored.data} config={config} />
        ) : (
          <BrandResults data={stored.data} config={config} />
        )}

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/login" search={{ mode: "signup", next: "results" }}>
              Save my results <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/vibe-check" })}>
            <RefreshCw className="mr-1 size-4" /> Retake
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function MusicianResults({ data, config }: { data: any; config: VibeCheckConfig }) {
  const result = calculateVibeScore(data, config);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-center text-sm uppercase tracking-[0.25em] text-muted-foreground">
        Your Vibe
      </p>
      <h1 className="mt-2 text-center font-display text-4xl md:text-6xl">
        <span className="text-gradient-racket">{result.primary}</span>
      </h1>
      {result.secondary && (
        <p className="mt-3 text-center text-muted-foreground">
          with hints of <span className="text-foreground">{result.secondary}</span>
          {result.isMultiHyphenate && " — you're a multi-hyphenate"}
        </p>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display text-2xl">What this means</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {getArtistArchetypeDescription(result.primary, config)}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Your archetype breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.sortedScores.map((s) => (
            <ScoreBar key={s.archetype} label={s.archetype} score={s.score} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BrandResults({ data, config }: { data: any; config: VibeCheckConfig }) {
  const result = calculateBrandVibe(data, config);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-center text-sm uppercase tracking-[0.25em] text-muted-foreground">
        Your Brand Vibe
      </p>
      <h1 className="mt-2 text-center font-display text-4xl md:text-6xl">
        <span className="text-gradient-racket">{result.brandArchetype.type}</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
        {result.brandArchetype.description}
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Top artist matches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(result.artistMatches || []).slice(0, 5).map((m: any) => (
            <ScoreBar key={m.archetype} label={m.archetype} score={m.score} />
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{Math.round(score)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            background: "linear-gradient(90deg, var(--primary), var(--coral))",
          }}
        />
      </div>
    </div>
  );
}
