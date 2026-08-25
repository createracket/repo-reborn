import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type VersionRow = {
  id: string;
  page_id: string;
  snapshot: Record<string, any>;
  saved_by: string | null;
  created_at: string;
};

// Fields we never write back when restoring a version.
const IMMUTABLE_FIELDS = new Set(["id", "created_at", "updated_at"]);

// Human-friendly preview of the copy-bearing fields.
const PREVIEW_FIELDS: Array<[string, string]> = [
  ["headline", "Headline"],
  ["subtitle", "Subtitle"],
  ["intro", "Intro"],
  ["host_bio", "Host bio"],
  ["partnership_pitch", "Partnership pitch"],
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripTags(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function PartnerPageHistory({
  pageId,
  pageTitle,
  onRestored,
}: {
  pageId: string;
  pageTitle?: string;
  onRestored?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_page_versions" as any)
      .select("id, page_id, snapshot, saved_by, created_at")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as VersionRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageId]);

  async function restore(row: VersionRow) {
    if (
      !confirm(
        `Restore the version saved ${formatWhen(row.created_at)}? The current content is snapshotted first, so you can undo this.`,
      )
    )
      return;
    setBusy(true);
    const patch: Record<string, any> = {};
    Object.entries(row.snapshot ?? {}).forEach(([key, value]) => {
      if (IMMUTABLE_FIELDS.has(key)) return;
      patch[key] = value;
    });
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("partner_pages" as any)
      .update(patch as any)
      .eq("id", pageId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Version restored");
    await load();
    onRestored?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="mr-1 size-3" /> History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {pageTitle ? `${pageTitle} — ` : ""}the 30 most recent saves. Restoring snapshots the
            current content first, so it can always be undone.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved versions yet. A snapshot is captured every time this page is edited from now on.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const isOpen = expanded === row.id;
              return (
                <div key={row.id} className="rounded-lg border border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="text-left text-sm hover:text-foreground/80"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                    >
                      <span className="font-medium">{formatWhen(row.created_at)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {isOpen ? "Hide content" : "Preview content"}
                      </span>
                    </button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => restore(row)}>
                      <RotateCcw className="mr-1 size-3" /> Restore
                    </Button>
                  </div>
                  {isOpen ? (
                    <div className="space-y-3 border-t border-border/60 px-3 py-3">
                      {PREVIEW_FIELDS.map(([key, label]) => {
                        const text = stripTags(row.snapshot?.[key]);
                        if (!text) return null;
                        return (
                          <div key={key}>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              {label}
                            </p>
                            <p className="whitespace-pre-wrap text-sm">{text}</p>
                          </div>
                        );
                      })}
                      {Array.isArray(row.snapshot?.eoi_opportunities) &&
                      row.snapshot.eoi_opportunities.length > 0 ? (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Opportunities
                          </p>
                          <ul className="list-disc pl-5 text-sm">
                            {row.snapshot.eoi_opportunities.map((o: string, i: number) => (
                              <li key={i}>{stripTags(o) || o}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {Array.isArray(row.snapshot?.audience_segments) &&
                      row.snapshot.audience_segments.length > 0 ? (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Audience segments
                          </p>
                          <ul className="list-disc pl-5 text-sm">
                            {row.snapshot.audience_segments.map((o: string, i: number) => (
                              <li key={i}>{stripTags(o) || o}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
