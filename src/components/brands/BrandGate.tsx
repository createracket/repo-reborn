import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, KeyRound } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isBrandsUnlocked, tryUnlockBrands } from "@/lib/brands-gate";

type Props = {
  children: ReactNode;
  /** Optional title for the lock screen */
  title?: string;
};

/**
 * Wraps brand-side pages behind a shared access code.
 * Unlock persists 30 days on the device.
 */
export function BrandGate({ children, title = "Brand access" }: Props) {
  // Start locked on SSR/first paint to avoid flashing private content.
  const [unlocked, setUnlocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnlocked(isBrandsUnlocked());
    setHydrated(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tryUnlockBrands(code)) {
      setUnlocked(true);
    } else {
      setError("That code doesn't match. Double-check and try again.");
    }
  }

  // Avoid hydration flicker: render nothing until we know.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/30">
          <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-pink-accent/15 text-pink-accent">
            <Lock className="size-6" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-accent">
            {title}
          </p>
          <h1 className="mt-2 font-headline text-2xl tracking-tight">
            Enter your access code
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Brand pages are currently private while we focus our launch on
            artists. If you've spoken to the Racket team, use the code we
            shared with you. Otherwise{" "}
            <Link to="/contact" className="text-primary hover:underline">
              get in touch
            </Link>{" "}
            and we'll send one over.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Access code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="RACKET-BRANDS-XXXX"
                autoFocus
                autoComplete="off"
                className="pl-9 uppercase tracking-wider"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Unlock brand pages
            </Button>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-2">
              Access remembered on this device for 30 days.
            </p>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
