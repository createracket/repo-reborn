import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  // Shared session — resolved once per visit, not once per component.
  const { ready, signedIn } = useAuth();

  useEffect(() => {
    if (ready && !signedIn) {
      navigate({ to: "/login", replace: true });
    }
  }, [ready, signedIn, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!signedIn) return null;

  return <Outlet />;
}
