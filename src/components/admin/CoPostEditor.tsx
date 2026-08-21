import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toProfileUrl, type SocialPlatform } from "@/lib/social-handles";
import {
  CO_POST_PLATFORMS,
  CO_POST_PLATFORM_LABEL,
  MAX_CO_POSTS_PER_PLATFORM,
  type CoPost,
  type CoPostPlatform,
} from "@/lib/co-posts";

/** Spotify links are used as-is; the others can be typed as bare handles. */
function canonicalUrl(platform: CoPostPlatform, raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (platform === "spotify") return value;
  return toProfileUrl(platform as SocialPlatform, value);
}

/**
 * Co-posted entries for a roster creator: the lead creator keeps all the normal
 * inputs, and up to 2 extra links per platform (Instagram, TikTok, YouTube and
 * Spotify) can be attached here.
 */
export function CoPostEditor({
  value,
  onChange,
  onFetch,
}: {
  value: CoPost[];
  onChange: (next: CoPost[]) => void;
  onFetch?: (url: string, platform: CoPostPlatform) => Promise<number | null>;
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
    const url = canonicalUrl(row.platform, row.url ?? "");
    if (!url) {
      toast.error("Enter a link or handle first");
      return;
    }
    setFetching(index);
    try {
      const followers = await onFetch(url, row.platform);
      if (followers == null) {
        toast.error("No follower count returned");
        return;
      }
      update(index, { url, followers });
      toast.success(`Fetched ${followers.toLocaleString()}`);
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
            Optional collaborators on the same post — up to {MAX_CO_POSTS_PER_PLATFORM} links per
            platform. Social followers count towards this creator's socials; Spotify monthly
            listeners count towards fans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CO_POST_PLATFORMS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => add(p)}
              disabled={value.filter((c) => c.platform === p).length >= MAX_CO_POSTS_PER_PLATFORM}
            >
              <Plus className="mr-1 size-3.5" /> {CO_POST_PLATFORM_LABEL[p]}
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
                {CO_POST_PLATFORM_LABEL[c.platform]}
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
                  placeholder={c.platform === "spotify" ? "Spotify artist URL" : "@handle or URL"}
                  className="text-sm"
                />
                {onFetch && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    title="Auto-sync"
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
                placeholder={c.platform === "spotify" ? "Monthly listeners" : "Followers"}
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
