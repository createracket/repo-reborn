import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const Route = createFileRoute("/vibe-check/musician")({
  head: () => ({
    meta: [
      { title: "Musician Vibe Check — Create Racket" },
      {
        name: "description",
        content:
          "Find your artist archetype: Loyalist, Changemaker, Curator, Builder, Live Wire, Maker or Advocate.",
      },
    ],
  }),
  component: MusicianFlow,
});

function MusicianFlow() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <OnboardingForm flow="musician" />
      </main>
      <SiteFooter />
    </div>
  );
}
