import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/roster-builder": "Roster Builder",
  "/campaign-builder": "Campaign Builder",
  "/campaign-reports": "Campaign Reports",
  "/profile": "Edit Profile",
  "/admin": "Admin",
  "/login": "Log In",
  "/signup": "Sign Up",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/results": "Results",
  "/contact": "Contact",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/brands/how-it-works": "How It Works",
  "/vibe-check": "Vibe Check",
};

function getPageLabel(pathname: string): string | null {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  if (pathname.startsWith("/spotlight/")) return "Spotlight";
  if (pathname.startsWith("/brief/")) return "Brief";
  if (pathname.startsWith("/roster/")) return "Roster";
  if (pathname.startsWith("/u/")) return "Profile";
  if (pathname.startsWith("/report/")) return "Campaign Report";

  return null;
}

export function PageBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (pathname === "/" || pathname === "/dashboard") return null;

  // Signed-out visitors on a shared spotlight link shouldn't see app chrome.
  if ((pathname.startsWith("/spotlight/") || pathname.startsWith("/brief/")) && !signedIn) return null;

  const label = getPageLabel(pathname);

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex items-center gap-3 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-0 py-0 text-muted-foreground hover:text-foreground"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        {label && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">{label}</span>
          </>
        )}
      </div>
    </div>
  );
}
