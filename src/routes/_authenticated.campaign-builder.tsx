import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { BriefsManager } from "@/components/admin/BriefsManager";

export const Route = createFileRoute("/_authenticated/campaign-builder")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CampaignBuilderPage,
});

function CampaignBuilderPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setReady(true);
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
          <p className="text-sm text-muted-foreground">You need admin access to view the campaign builder.</p>
        ) : (
          <BriefsManager />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
