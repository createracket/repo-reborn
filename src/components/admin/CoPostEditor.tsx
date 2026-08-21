import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toProfileUrl } from "@/lib/social-handles";
import { MAX_CO_POSTS_PER_PLATFORM, type CoPost, type CoPostPlatform } from "@/lib/co-posts";

const PLATFORMS: Array<{ key: CoPostPlatform; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
];

/**
 * Co-posted entries for a roster creator: the lead creator keeps all the normal
 * inputs, and up to 2 extra Instagram + 2 extra TikTok collaborator links can be
 * attached here.
 */
export function CoPostEditor({
  value,
  onChange,
  onFetch,
}: {
  value: CoPost[];
  onChange: (next: CoPost[]) => void;
  onFetch?: (url: string) => Promise<number | null>;
}) {
  const [fetching, setFetching] = useState<number | null>(null);

  const update = (index: number, patch: Partial<CoPost>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const add = (platform: CoPostPlatform) => {
    if (value.filter((c) => c.platform === platform).length >= MAX_CO_POSTS_PER_PLATFORM) return;
    onChange([...value, { platform, name: "", url: "", followers: null }]);
  };

  async function fetchFollowers(index: number) {
    const row = value[index];
    if (!onFetch) return;
    const url = toProfileUrl(row.platform, row.url ?? "");
    if (!url) {
      toast.error("Enter a link or handle first");
      return;
    }
    setFetching(index);
    try {
      const followers = await onFetch(url);
      if (followers == null) {
        toast.error("No follower count returned");
        return;
      }
      update(index, { url, followers });
      toast.success(`Fetched ${followers.toLocaleString()} followers`);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't fetch followers");
    } finally {
      setFetching(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Co-posted with
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Optional collaborators on the same post — up to {MAX_CO_POSTS_PER_PLATFORM} Instagram
            and {MAX_CO_POSTS_PER_PLATFORM} TikTok links. Their followers count towards this
            creator's totals.
          </p>
        </div>
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => add(p.key)}
              disabled={value.filter((c) => c.platform === p.key).length >= MAX_CO_POSTS_PER_PLATFORM}
            >
              <Plus className="mr-1 size-3.5" /> {p.label}
            </Button>
          ))}
        </div>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">No co-posts added.</p>
      ) : (
        <div className="space-y-2">
          {value.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_7rem_auto]">
              <span className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.platform === "tiktok" ? "TikTok" : "Instagram"}
              </span>
              <Input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Creator name"
                className="text-sm"
              />
              <div className="flex gap-1">
                <Input
                  value={c.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="@handle or URL"
                  className="text-sm"
                />
                {onFetch && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    title="Auto-sync followers"
                    onClick={() => fetchFollowers(i)}
                    disabled={fetching === i}
                  >
                    <RefreshCw className={`size-3.5 ${fetching === i ? "animate-spin" : ""}`} />
                  </Button>
                )}
              </div>
              <Input
                inputMode="numeric"
                value={c.followers ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[,\s]/g, ""));
                  update(i, {
                    followers: e.target.value.trim() && Number.isFinite(n) ? n : null,
                  });
                }}
                placeholder="Followers"
                className="text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                title="Remove co-post"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
