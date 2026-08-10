import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/racket-desk")({
  head: () => ({
    meta: [
      { title: "Racket Desk — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RacketDeskLayout,
});

const NAV: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/racket-desk", label: "Today", exact: true },
  { to: "/racket-desk/fan-intel", label: "Fan intel" },
  { to: "/racket-desk/social-listening", label: "Social listening" },
  { to: "/racket-desk/profiles", label: "My profiles" },
  { to: "/racket-desk/reports", label: "Reports" },
  
];

function RacketDeskLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
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
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Admin only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The Racket Desk is an internal tool. You need admin access to view it.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Racket Desk</h1>
            <p className="mt-2 text-muted-foreground">Music &amp; culture intelligence, internal preview.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin">← Back to admin</Link>
            </Button>
          </div>
        </div>

        <div className="inline-flex max-w-full flex-wrap items-center justify-start gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${
                  active ? "bg-background text-foreground shadow" : "hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
