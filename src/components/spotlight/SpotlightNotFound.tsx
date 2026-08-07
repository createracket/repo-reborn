import { Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

export function SpotlightNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Spotlight not found</h1>
        <p className="mt-2 text-muted-foreground">This page may be unpublished or doesn't exist.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </main>
      <SiteFooter />
    </div>
  );
}
