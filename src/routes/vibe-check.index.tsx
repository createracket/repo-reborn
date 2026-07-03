import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic2, Users, ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/vibe-check/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

function VibeCheckLanding() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            The Vibe Check
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl">
            <span className="text-foreground">WHAT'S YOUR</span>{" "}
            <span className="text-gradient-racket">RACKET</span>?
          </h1>
          <p className="mt-5 text-muted-foreground">
            Pick a lane. We'll learn your archetype and start matching you to the
            right people. ~5 minutes.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <FlowCard
            icon={<Mic2 className="size-6 text-primary" />}
            title="Musician / Creator"
            blurb="For artists, bands, DJs, songwriters, producers and creators."
            to="/vibe-check/musician"
          />
          <FlowCard
            icon={<Users className="size-6 text-coral" />}
            title="Brand / Agency"
            blurb="For brands, agencies and labels building a campaign or roster."
            to="/vibe-check/brand"
            comingSoon
          />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function FlowCard({
  icon,
  title,
  blurb,
  to,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  to: string;
  comingSoon?: boolean;
}) {
  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        className="relative cursor-not-allowed rounded-2xl border border-border/60 bg-card p-8 opacity-60"
      >
        <span className="absolute right-4 top-4 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Coming soon
        </span>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-background">
          {icon}
        </div>
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-2 text-muted-foreground">{blurb}</p>
        <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
          Available soon
        </div>
      </div>
    );
  }
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-primary/60 hover:shadow-lg"
    >
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-background">
        {icon}
      </div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-2 text-muted-foreground">{blurb}</p>
      <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

