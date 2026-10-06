import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fingerprint of the app's bundled script files; changes after each publish.
function fingerprint(html: string): string {
  const m = html.match(/\/assets\/[^"' )]+\.js/g) ?? [];
  return Array.from(new Set(m)).sort().join("|");
}

/** Shows "New version available — Refresh" after the site is republished. */
export function NewVersionBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const current = fingerprint(document.documentElement.outerHTML);
    if (!current) return;
    let lastCheck = 0;
    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      try {
        const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return;
        const next = fingerprint(await res.text());
        if (next && next !== current) setOutdated(true);
      } catch {
        /* offline — try later */
      }
    };
    const t = setInterval(check, 10 * 60_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!outdated) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg">
      <span>New version available</span>
      <Button size="sm" variant="purple" className="rounded-full" onClick={() => window.location.reload()}>
        <RefreshCw className="mr-1.5 size-3.5" /> Refresh
      </Button>
      <button className="text-muted-foreground hover:text-foreground" onClick={() => setOutdated(false)} aria-label="Dismiss">×</button>
    </div>
  );
}
