import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vibe-check/brand")({
  head: () => ({
    meta: [
      { title: "Brand Vibe Check — Coming Soon — Create Racket" },
      {
        name: "description",
        content:
          "The Brand & Agency Vibe Check is coming soon. Join the waitlist to be first in.",
      },
    ],
  }),
  component: BrandComingSoon,
});

function BrandComingSoon() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center md:py-28">
        <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-card">
          <Users className="size-7 text-coral" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Coming soon
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          BRAND VIBE CHECK
        </h1>
        <p className="mt-5 text-muted-foreground">
          We're focusing on artists for our soft launch. The Brand & Agency
          Vibe Check is on the way — drop your details and we'll let you know
          the moment it's live.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/signup">Join the waitlist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/vibe-check">Back to Vibe Check</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
