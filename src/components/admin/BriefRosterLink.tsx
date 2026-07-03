import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type RosterOption = { id: string; title: string; slug: string | null; published: boolean };

let cache: Promise<RosterOption[]> | null = null;
function loadRosters(): Promise<RosterOption[]> {
  if (!cache) {
    cache = (async () => {
      const { data, error } = await (supabase as any)
        .from("rosters")
        .select("id, title, slug, published")
        .order("updated_at", { ascending: false });
      if (error) {
        cache = null;
        throw error;
      }
      return ((data ?? []) as RosterOption[]);
    })();
  }
  return cache;
}

export function BriefRosterLink({
  briefSource,
  briefId,
  linkedRosterId,
  onChange,
}: {
  briefSource: "user" | "lead";
  briefId: string;
  linkedRosterId: string | null | undefined;
  onChange?: (nextId: string | null) => void;
}) {
  const [rosters, setRosters] = useState<RosterOption[]>([]);
  const [value, setValue] = useState<string | null>(linkedRosterId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(linkedRosterId ?? null);
  }, [linkedRosterId]);

  useEffect(() => {
    let cancelled = false;
    loadRosters()
      .then((r) => {
        if (!cancelled) setRosters(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => rosters.find((r) => r.id === value) ?? null,
    [rosters, value],
  );

  async function save(next: string | null) {
    setSaving(true);
    const prev = value;
    setValue(next);
    const table = briefSource === "user" ? "campaign_briefs" : "lead_briefs";
    const { error } = await (supabase as any)
      .from(table)
      .update({ linked_roster_id: next })
      .eq("id", briefId);
    setSaving(false);
    if (error) {
      setValue(prev);
      toast.error(error.message);
      return;
    }
    onChange?.(next);
    toast.success(next ? "Roster linked" : "Roster unlinked");
  }

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Linked roster
      </div>
      <Select
        value={value ?? "__none"}
        onValueChange={(v) => save(v === "__none" ? null : v)}
        disabled={saving}
      >
        <SelectTrigger className="h-8 w-[220px] text-xs">
          <SelectValue placeholder="Select a roster" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none" className="text-xs">
            — None —
          </SelectItem>
          {rosters.map((r) => (
            <SelectItem key={r.id} value={r.id} className="text-xs">
              {r.title}
              {!r.published ? " (draft)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && selected.published && selected.slug ? (
        <Link
          to="/roster/$slug"
          params={{ slug: selected.slug }}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Open roster page <ExternalLink className="h-3 w-3" />
        </Link>
      ) : selected && !selected.published ? (
        <span className="text-[11px] text-muted-foreground">
          Roster is a draft — publish it so it opens from the badge.
        </span>
      ) : null}
    </div>
  );
}
