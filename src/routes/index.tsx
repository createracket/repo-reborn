import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Users, Mic2 } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Create Racket — Louder, stranger collaborations" },
      {
        name: "description",
        content:
          "Create Racket is the community + dashboard for musicians, brands, creators and fans building louder, stranger, more meaningful collaborations.",
      },
      { property: "og:title", content: "Create Racket" },
      {
        property: "og:description",
        content:
          "Match with the right artists, brands and creators. Take the Vibe Check to find your archetype.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 60%)" }}
        />
        <div className="container relative mx-auto px-4 pt-20 pb-24 text-center md:pt-28 md:pb-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="size-3 text-primary" /> New: the Vibe Check is live
          </div>

          <h1 className="mx-auto max-w-4xl">
            <Wordmark size="xl" className="justify-center text-center" />
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            The community + dashboard for{" "}
            <span className="text-foreground">musicians</span>,{" "}
            <span className="text-foreground">brands</span>,{" "}
            <span className="text-foreground">creators</span> and{" "}
            <span className="text-foreground">fans</span> building louder, stranger,
            more meaningful collaborations.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to="/vibe-check">
                Take the Vibe Check <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/fan-signup">Just here to follow along</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-5xl">PICK YOUR LANE</h2>
          <p className="mt-4 text-muted-foreground">
            Two flows, one community. Tell us who you are and we'll match you with
            the right people.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <LaneCard
            icon={<Mic2 className="size-6 text-primary" />}
            title="I'm a musician / creator"
            blurb="Find your archetype, get matched with values-aligned brands, and build a roster that actually fits your vibe."
            cta="Start the musician Vibe Check"
            to="/vibe-check/musician"
          />
          <LaneCard
            icon={<Users className="size-6 text-coral" />}
            title="I'm a brand / agency"
            blurb="Brief us once. We surface artists whose values, audience and energy genuinely line up with what you're building."
            cta="Start the brand Vibe Check"
            to="/vibe-check/brand"
          />
        </div>
      </section>

      {/* COMMUNITY STRIP */}
      <section id="community" className="border-t border-border/60 bg-sidebar/60">
        <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-3 md:py-20">
          <Stat n="7" label="Artist archetypes you might be" />
          <Stat n="5" label="Brand archetypes we map to" />
          <Stat n="∞" label="Ways to create racket" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function LaneCard({
  icon,
  title,
  blurb,
  cta,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  cta: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-primary/60 hover:shadow-lg"
    >
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-background">
        {icon}
      </div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-3 text-muted-foreground">{blurb}</p>
      <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
        {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="font-display text-5xl text-gradient-racket md:text-6xl">{n}</div>
      <div className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
