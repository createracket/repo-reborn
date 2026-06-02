import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/Wordmark";
import { supabase } from "@/integrations/supabase/client";

/**
 * Header for inner pages (vibe-check, login, dashboard, etc).
 * The homepage has its own transparent header rendered inside the hero.
 */
export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      checkAdmin(data.session?.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      checkAdmin(session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <Wordmark variant="colour" className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/vibe-check" className="hover:text-foreground transition-colors">
            Vibe Check
          </Link>
          {!signedIn && (
            <Link to="/fan-signup" className="hover:text-foreground transition-colors">
              Mailing list
            </Link>
          )}
          {isAdmin && (
            <>
              <Link to="/admin" className="text-primary hover:text-foreground transition-colors">
                Admin
              </Link>
              <Link to="/connect" className="hover:text-foreground transition-colors">
                Connect
              </Link>
              <Link to="/#testimonials" className="hover:text-foreground transition-colors">
                Community
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm" variant="default">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/vibe-check">Take the Vibe Check</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
