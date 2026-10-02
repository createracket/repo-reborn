import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trends, type Trend } from "@/lib/racket-desk/trends";

const MAX_CARDS = 6;

/** Rotates the curated pool by day so a fresh idea leads the row every day. */
export function dailyTrends(date = new Date()): Trend[] {
  const day = Math.floor(date.getTime() / 86_400_000);
  const n = trends.length;
  if (!n) return [];
  const start = ((day % n) + n) % n;
  return [...trends.slice(start), ...trends.slice(0, start)].slice(0, MAX_CARDS);
}

export function TrendFeedStrip() {
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const today = useMemo(() => dailyTrends(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!alive || !u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase
        .from("saved_trends")
        .select("trend_id")
        .eq("user_id", u.user.id);
      if (alive) setSaved(new Set((data ?? []).map((r) => r.trend_id)));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleSave = async (t: Trend) => {
    if (!userId) return;
    const isSaved = saved.has(t.id);
    const next = new Set(saved);
    if (isSaved) next.delete(t.id);
    else next.add(t.id);
    setSaved(next);
    const { error } = isSaved
      ? await supabase.from("saved_trends").delete().eq("user_id", userId).eq("trend_id", t.id)
      : await supabase.from("saved_trends").insert({ user_id: userId, trend_id: t.id, trend_title: t.title });
    if (error) {
      setSaved(saved);
      toast.error("Couldn't update your saved inspo");
    } else if (!isSaved) toast.success("Saved to your inspo");
  };

  const list = showSaved ? trends.filter((t) => saved.has(t.id)) : today;

  return (
    <section className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Trend feed</div>
          <h2 className="mt-1 font-display text-2xl tracking-tight">Breaking right now</h2>
        </div>
        <div className="inline-flex rounded-full border border-border p-0.5 text-xs">
          <button
            onClick={() => setShowSaved(false)}
            className={`rounded-full px-3 py-1.5 ${!showSaved ? "bg-lime font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Today's ideas
          </button>
          <button
            onClick={() => setShowSaved(true)}
            className={`rounded-full px-3 py-1.5 ${showSaved ? "bg-lime font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Saved inspo{saved.size ? ` (${saved.size})` : ""}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing saved yet — tap the bookmark on any idea to keep it here.
        </p>
      ) : (
        <div className="-mx-1 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {list.map((t, i) => (
            <MiniTrendCard
              key={t.id}
              trend={t}
              isToday={!showSaved && i === 0}
              saved={saved.has(t.id)}
              onSave={() => toggleSave(t)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MiniTrendCard({
  trend,
  isToday,
  saved,
  onSave,
}: {
  trend: Trend;
  isToday: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <article className="flex w-[78%] shrink-0 snap-start flex-col rounded-xl border border-border bg-background/40 p-4 transition hover:border-lime/50 sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-2.25rem)/4)]">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
          {trend.platform} · {trend.region}
        </span>
        {isToday && (
          <span className="rounded-sm bg-coral/90 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-primary-foreground">
            Today
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-base leading-snug">{trend.title}</h3>
      <div className="mt-1 text-xs text-muted-foreground">{trend.format}</div>
      <p className="mt-2 line-clamp-3 text-xs italic text-foreground/80">"{trend.hookLine}"</p>
      <div className="mt-auto pt-3">
        <div className="flex items-center gap-1 text-xs font-semibold text-lime">
          <Flame className="h-3.5 w-3.5" /> {trend.heat}
          <span className="font-normal text-muted-foreground">· {trend.velocity}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <a
            href={trend.sources[0]?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> See live
          </a>
          <button
            onClick={onSave}
            aria-label={saved ? "Remove from saved inspo" : "Save to inspo"}
            className={`inline-flex items-center justify-center rounded-full border p-2 ${saved ? "border-lime bg-lime text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  );
}
