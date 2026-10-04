import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUser } from "@/hooks/use-auth";
import { CampaignManager } from "@/components/admin/CampaignManager";

export const Route = createFileRoute("/_authenticated/campaign-builder")({
  head: () => ({ meta: [{ title: "Campaign Manager — Create Racket" }, { name: "description", content: "Manage campaigns, briefs, rosters and reports." }, { property: "og:title", content: "Campaign Manager — Create Racket" }, { property: "og:description", content: "Manage campaigns, briefs, rosters and reports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: CampaignBuilderPage,
});

function CampaignBuilderPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await getAuthUser();
      if (!u.user) {
        setReady(true);
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setAllowed(!!role);
      setReady(true);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {!ready ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !allowed ? (
          <p className="text-sm text-muted-foreground">You need admin access to view the campaign manager.</p>
        ) : (
          <CampaignManager />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
