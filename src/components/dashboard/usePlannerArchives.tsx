import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePlannerArchives() {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!alive || !uid) return;
      setUserId(uid);
      const { data } = await (supabase as any).from("planner_archives").select("item_key").eq("user_id", uid);
      if (alive) setKeys(new Set((data ?? []).map((r: any) => r.item_key)));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback(
    async (key: string) => {
      if (!userId) return;
      const archived = keys.has(key);
      setKeys((prev) => {
        const next = new Set(prev);
        archived ? next.delete(key) : next.add(key);
        return next;
      });
      const q = (supabase as any).from("planner_archives");
      const { error } = archived
        ? await q.delete().eq("user_id", userId).eq("item_key", key)
        : await q.insert({ user_id: userId, item_key: key });
      if (error) {
        toast.error("Couldn't update archive");
        setKeys((prev) => {
          const next = new Set(prev);
          archived ? next.add(key) : next.delete(key);
          return next;
        });
      } else {
        toast.success(archived ? "Restored to planner" : "Archived");
      }
    },
    [keys, userId],
  );

  return { archived: keys, toggle };
}

export function ArchiveToggleButton({ archived, onClick }: { archived: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={archived ? "Restore to planner" : "Archive"}
      title={archived ? "Restore to planner" : "Archive"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="absolute bottom-2 right-2 z-10 rounded-full border border-border bg-card p-1.5 text-muted-foreground opacity-70 transition hover:text-foreground hover:opacity-100"
    >
      {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
    </button>
  );
}
