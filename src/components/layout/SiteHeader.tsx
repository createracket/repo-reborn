import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumbs } from "./PageBreadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import racketNavLogo from "@/assets/logo-singleR-transparent.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";

/**
 * Header for inner pages (vibe-check, login, dashboard, etc).
 * The homepage has its own transparent header rendered inside the hero.
 */
export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const hasMobileNav = !signedIn || isAdmin;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
          <Link
            to={signedIn ? "/dashboard" : "/"}
            className="flex shrink-0 items-center"
          >
            <img src={racketNavLogo.url} alt="Racket" className="h-8 w-auto" />
          </Link>
          {!minimal && (
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
              {!signedIn && (
                <Link to="/signup" className="hover:text-foreground transition-colors">
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
                </>
              )}
            </nav>
          )}
          {!minimal && (
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {signedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="default" className="gap-1">
                      <LayoutDashboard className="size-4" />
                      <span className="hidden xs:inline sm:inline">Dashboard</span>
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="size-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/login">Log in</Link>
                </Button>
              )}

              {hasMobileNav && (
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="md:hidden"
                      aria-label="Open menu"
                    >
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 sm:w-80">
                    <SheetHeader className="text-left">
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <nav className="mt-6 flex flex-col gap-1 text-base">
                      {!signedIn && (
                        <>
                          <MobileLink to="/login">Log in</MobileLink>
                          <MobileLink to="/signup">Mailing list</MobileLink>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <MobileLink to="/dashboard">Dashboard</MobileLink>
                          <MobileLink to="/admin" highlight>Admin</MobileLink>
                          <MobileLink to="/connect">Connect</MobileLink>
                          <MobileLink to="/profile">Edit Profile</MobileLink>
                        </>
                      )}
                    </nav>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          )}
        </div>
      </header>
      {!minimal && <PageBreadcrumbs />}
    </>
  );
}

function MobileLink({
  to,
  children,
  highlight,
}: {
  to: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground ${
        highlight ? "text-primary font-medium" : "text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
