import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAuthSessionResult } from "@/hooks/use-auth";

// Heavy builder — only downloaded on this route.
const SpotlightForm = lazy(() =>
  import("@/components/admin/AdminLegacyTabs").then((m) => ({ default: m.SpotlightForm })),
);

export const Route = createFileRoute("/_authenticated/admin/spotlights/edit/$key")({
  head: () => ({
    meta: [
      { title: "Edit spotlight — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditSpotlightPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}

function EditSpotlightPage() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [spotlight, setSpotlight] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await getAuthSessionResult();
      const uid = s.session?.user?.id;
      if (!uid) {
        navigate({ to: "/login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      if (!roleRow) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);

      const query = supabase.from("partner_pages" as any).select("*").eq("section", "spotlight");
      const { data: row } = await (UUID_RE.test(key)
        ? query.eq("id", key)
        : query.eq("slug", key)
      ).maybeSingle();
      if (!active) return;
      setSpotlight((row as any) ?? null);
      setChecking(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (checking) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading spotlight…</p>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <ShieldAlert className="size-5 text-destructive" /> Restricted
            </CardTitle>
            <CardDescription>This area is admin-only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!spotlight) {
    return (
      <Shell>
        <h1 className="font-display text-3xl">Spotlight not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This spotlight may have been deleted.</p>
        <Button asChild className="mt-6" variant="outline"><Link to="/admin/spotlights">← All spotlights</Link></Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-4xl md:text-5xl">Edit spotlight</h1>
          <p className="mt-2 text-muted-foreground">Updating /spotlight/{spotlight.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/spotlight/${spotlight.slug}`} target="_blank" rel="noreferrer">View page</a>
          </Button>
          <Button asChild variant="outline"><Link to="/admin/spotlights">← All spotlights</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading builder…</p>}>
            <SpotlightForm
              key={spotlight.id}
              section="spotlight"
              editData={spotlight}
              onCreated={() => navigate({ to: "/admin/spotlights" })}
              onUpdated={() => {
                // Stay on the editor after updating — just keep the page in place.
              }}
              onCancel={() => navigate({ to: "/admin/spotlights" })}
            />
          </Suspense>
        </CardContent>
      </Card>
    </Shell>
  );
}
