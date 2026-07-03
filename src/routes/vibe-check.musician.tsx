import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vibe-check/musician")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
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
