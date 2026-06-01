import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WordmarkInline } from "@/components/brand/Wordmark";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <WordmarkInline />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/vibe-check" className="hover:text-foreground transition-colors">
            Vibe Check
          </Link>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#community" className="hover:text-foreground transition-colors">
            Community
          </a>
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
