import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SpotlightNotFound } from "@/components/spotlight/SpotlightNotFound";
import { SpotlightPageView } from "@/components/spotlight/SpotlightPageView";
import { Button } from "@/components/ui/button";
import { shareMeta } from "@/lib/share-meta";
import { getSharePreview } from "@/lib/share-preview.functions";

export const Route = createFileRoute("/brief/$slug")({
  // Brief pages are shared by link only and deliberately not indexable,
  // but link previews still need this page's own image and copy.
  loader: ({ params }) =>
    getSharePreview({ data: { slug: params.slug, kind: "brief" } }).catch(() => null),
  head: ({ loaderData }) => ({
    meta: shareMeta({
      preview: loaderData,
      fallbackTitle: "Brief — Create Racket",
      fallbackDescription: "Campaign brief.",
      noindex: true,
    }),
  }),
  component: BriefRoute,
  notFoundComponent: SpotlightNotFound,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function BriefRoute() {
  const { slug } = Route.useParams();
  return <SpotlightPageView slug={slug} kind="brief" />;
}
