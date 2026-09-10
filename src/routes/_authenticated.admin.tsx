import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAuthSessionResult } from "@/hooks/use-auth";
import { ADMIN_TABS } from "@/components/admin/admin-tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
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
      setIsAdmin(!!roleRow);
      setChecking(false);
    })();
  }, [navigate]);

  // Lightweight badge count — two head-only queries, no row payloads.
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [cm, si] = await Promise.all([
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
        supabase.from("spotlight_interests" as any).select("id", { count: "exact", head: true }).eq("handled", false),
      ]);
      setUnread((cm.count ?? 0) + (si.count ?? 0));
    })().catch(() => undefined);
  }, [isAdmin]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Verifying access…</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
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
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Dev view</h1>
            <p className="mt-2 text-muted-foreground">Backend records across the platform.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/roster-builder">Roster Builder →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/briefs">Briefs →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campaign-reports">Campaign Reports →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campaign-builder">Campaign Builder →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/racket-desk">Racket Desk →</Link>
            </Button>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
          {ADMIN_TABS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground"
              activeProps={{ className: "bg-background text-foreground shadow" }}
            >
              {t.label}
              {t.path === "/admin/contact" && unread > 0 ? (
                <span className="absolute -right-1 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground shadow">
                  {unread}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
