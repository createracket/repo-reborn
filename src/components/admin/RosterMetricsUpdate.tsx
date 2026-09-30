import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { scrapeProfileFollowers, scrapeSpotifyArtist } from "@/lib/campaign-scrapers.functions";

type Item = Record<string, unknown> & { id: string; name: string };

const SOCIALS = [
  ["instagram_url", "instagram_followers"],
  ["tiktok_url", "tiktok_followers"],
  ["youtube_url", "youtube_subscribers"],
  ["twitch_url", "twitch_followers"],
  ["facebook_url", "facebook_followers"],
  ["x_url", "x_followers"],
] as const;

type Task = { item: Item; urlKey: string; countKey: string; spotify?: boolean };

export function RosterMetricsUpdate({
  items,
  onFinished,
}: {
  items: Item[];
  onFinished: () => void | Promise<void>;
}) {
  const scrapeProfile = useServerFn(scrapeProfileFollowers);
  const scrapeSpotify = useServerFn(scrapeSpotifyArtist);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  const tasks: Task[] = items.flatMap((item) => {
    const t: Task[] = SOCIALS.filter(([u]) => String(item[u] ?? "").trim()).map(([u, c]) => ({
      item,
      urlKey: u,
      countKey: c,
    }));
    if (String(item.spotify_url ?? "").trim())
      t.push({ item, urlKey: "spotify_url", countKey: "spotify_monthly_listens", spotify: true });
    return t;
  });

  async function run() {
    if (!tasks.length) {
      toast.error("No creator links to update.");
      return;
    }
    if (!confirm(`Update ${tasks.length} links across ${items.length} creators? Keep this page open — about ${Math.max(1, Math.ceil((tasks.length / 4) * 15 / 60))} min.`)) return;
    setFailures([]);
    setProgress({ done: 0, total: tasks.length });
    const fails: string[] = [];
    const patches = new Map<string, Record<string, number>>();
    const queue = [...tasks];
    let done = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (;;) {
          const t = queue.shift();
          if (!t) return;
          const url = String(t.item[t.urlKey]).trim();
          const label = `${t.item.name} (${t.urlKey.replace("_url", "")})`;
          try {
            let n: number | null = null;
            if (t.spotify) {
              const r = await scrapeSpotify({ data: { url } });
              if (!r.ok) throw new Error(r.error);
              n = r.monthly_listeners ?? null;
            } else {
              const r = await scrapeProfile({ data: { url } });
              if (!r.ok) throw new Error(r.error);
              n = r.followers ?? null;
            }
            if (n == null) throw new Error("No number returned");
            const p = patches.get(t.item.id) ?? {};
            p[t.countKey] = n;
            patches.set(t.item.id, p);
          } catch (e) {
            fails.push(`${label} — ${(e as Error).message || "failed"}`);
          }
          done += 1;
          setProgress({ done, total: tasks.length });
        }
      }),
    );
    const month = new Date().toISOString().slice(0, 7);
    for (const [id, p] of patches) {
      const { error } = await supabase
        .from("roster_items")
        .update({ ...p, metrics_month: month } as never)
        .eq("id", id);
      if (error) fails.push(`Save failed — ${error.message}`);
    }
    setFailures(fails);
    setProgress(null);
    toast.success(`Metrics updated — ${tasks.length - fails.length} of ${tasks.length} links.`);
    await onFinished();
  }

  const running = !!progress;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">Metrics</div>
      <p className="mb-3 text-xs text-muted-foreground">
        Re-fetch followers and monthly listeners for every creator on this roster. Keep this page
        open while it runs.
      </p>
      <Button type="button" onClick={run} disabled={running} className="w-full">
        {running ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
        {running ? `Updating… ${progress.done}/${progress.total}` : "Update all metrics"}
      </Button>
      {running && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {failures.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {failures.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
