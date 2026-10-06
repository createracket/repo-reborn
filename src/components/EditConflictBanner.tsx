import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Watch = { table: string; column: string; value: string };

// Writes made from this tab (any non-GET call to the database API) are
// remembered so our own saves never trigger the "updated elsewhere" banner.
let lastLocalWriteAt = 0;
let fetchPatched = false;
function patchFetch() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (method !== "GET" && method !== "HEAD") {
      if (url.includes("/rest/v1/") || url.includes("/_serverFn/")) lastLocalWriteAt = Date.now();
    }
    return orig(input, init).finally(() => {
      if (method !== "GET" && method !== "HEAD") lastLocalWriteAt = Date.now();
    });
  };
}

async function latest(w: Watch): Promise<number> {
  const { data, error } = await supabase
    .from(w.table as any)
    .select("updated_at")
    .eq(w.column, w.value)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return 0;
  return new Date((data[0] as any).updated_at).getTime() || 0;
}

/**
 * Shows a "updated elsewhere — Refresh" bar when a record being edited is
 * saved from another tab or by another admin. Never reloads on its own, so
 * nothing being typed is lost.
 */
export function EditConflictBanner({ watches, intervalMs = 60_000 }: { watches: Watch[]; intervalMs?: number }) {
  const [stale, setStale] = useState(false);
  const seen = useRef<number>(0);
  const key = JSON.stringify(watches);

  useEffect(() => {
    patchFetch();
    setStale(false);
    seen.current = 0;
    if (!watches.length) return;
    let active = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const vals = await Promise.all(watches.map(latest));
      const max = Math.max(0, ...vals);
      if (!active || !max) return;
      if (!seen.current) {
        seen.current = max;
        return;
      }
      if (max > seen.current) {
        const ours = Date.now() - lastLocalWriteAt < 15_000;
        seen.current = max;
        if (!ours) setStale(true);
      }
    };
    check();
    const t = setInterval(check, intervalMs);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      active = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);

  if (!stale) return null;
  return (
    <div className="sticky top-2 z-40 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-md">
      <span>This page was updated somewhere else. Refresh to see the latest — any unsaved changes here will be lost.</span>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setStale(false)}>Dismiss</Button>
        <Button size="sm" variant="purple" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1.5 size-3.5" /> Refresh
        </Button>
      </div>
    </div>
  );
}
