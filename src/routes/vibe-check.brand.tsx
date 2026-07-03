import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const Route = createFileRoute("/vibe-check/brand")({
  head: () => ({
    meta: [
      { title: "Brand Vibe Check — Create Racket" },
      {
        name: "description",
        content:
          "Find your brand archetype and start matching with artists who share your audience.",
      },
    ],
  }),
  component: BrandFlow,
});

function BrandFlow() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <OnboardingForm flow="brand" />
      </main>
      <SiteFooter />
    </div>
  );
}
