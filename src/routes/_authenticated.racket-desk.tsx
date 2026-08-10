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
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Admin only</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The Racket Desk is an internal tool. You need admin access to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/racket-desk" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-lime text-primary-foreground">
              <Radio className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-sm">Racket Desk</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin preview</div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-1.5 text-xs">
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full border px-3 py-1.5 transition ${
                    active
                      ? "border-lime bg-lime font-semibold text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/admin"
            className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to admin
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
