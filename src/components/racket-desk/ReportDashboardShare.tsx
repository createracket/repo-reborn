import { useEffect, useMemo, useState } from "react";
import { Loader2, LayoutDashboard, X } from "lucide-react";
import { toast } from "sonner";

import {
  listReportAssignees,
  searchReportAssignees,
  setReportAssignee,
  setReportDashboardVisibility,
  getMyShareTarget,
  type ShareTarget,
} from "@/lib/racket-desk/report-sharing.functions";

export function ReportDashboardShare({
  scanId,
  initialVisible,
}: {
  scanId: string;
  initialVisible: boolean;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState<ShareTarget[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShareTarget[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    listReportAssignees({ data: { scanId } })
      .then(setAssignees)
      .catch((e: any) => toast.error(e?.message ?? "Could not load assignees"));
  }, [open, scanId]);

  async function toggleVisible() {
    setBusy(true);
    try {
      await setReportDashboardVisibility({ data: { scanId, visible: !visible } });
      setVisible(!visible);
      setOpen(!visible);
      toast.success(!visible ? "Saved to dashboard" : "Removed from dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function shareWithMe() {
    try {
      const me = await getMyShareTarget();
      if (assignees.some((a) => a.user_id === me.user_id)) {
        toast.info("Already shared with you");
        setOpen(true);
        return;
      }
      await setReportAssignee({ data: { scanId, targetUserId: me.user_id, assigned: true } });
      setAssignees((a) => [...a, me]);
      setOpen(true);
      toast.success("Shared with your Project planner");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not share with you");
    }
  }

  async function search() {
    setSearching(true);
    try {
      setResults(await searchReportAssignees({ data: { q: query } }));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not search profiles");
    } finally {
      setSearching(false);
    }
  }

  async function assign(t: ShareTarget, assigned: boolean) {
    try {
      await setReportAssignee({ data: { scanId, targetUserId: t.user_id, assigned } });
      setAssignees((a) =>
        assigned ? [...a.filter((x) => x.user_id !== t.user_id), t] : a.filter((x) => x.user_id !== t.user_id),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update assignment");
    }
  }

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {visible
              ? "Showing in Project planner for you and assigned profiles only."
              : "Push this report into the Project planner section."}
          </p>
        </div>
        <button
          onClick={toggleVisible}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            visible
              ? "border border-border text-muted-foreground hover:text-foreground"
              : "bg-lime text-primary-foreground hover:opacity-90"
          }`}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LayoutDashboard className="h-3.5 w-3.5" />
          )}
          {visible ? "Remove from dashboard" : "Save to dashboard"}
        </button>
      </div>

      {visible && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-xs text-lime hover:underline"
            >
              {open ? "Hide" : "Manage"} assigned profiles ({assignees.length})
            </button>
            <button
              onClick={shareWithMe}
              className="rounded-full border border-border px-3 py-1 text-xs hover:text-lime"
            >
              Share with me (admin)
            </button>
          </div>

          {open && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {assignees.map((a) => (
                  <span
                    key={a.user_id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-lime/50 px-3 py-1 text-xs"
                  >
                    {a.display_name || a.email || a.user_id.slice(0, 8)}
                    <button onClick={() => assign(a, false)} aria-label="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {assignees.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Not assigned to anyone yet — only you can see it.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="Search profiles by name or email"
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
                />
                <button
                  onClick={search}
                  className="rounded-full border border-border px-4 py-2 text-xs hover:text-lime"
                >
                  {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                </button>
              </div>

              {results.length > 0 && (
                <ul className="max-h-52 space-y-1 overflow-auto text-sm">
                  {results.map((r) => {
                    const on = assignees.some((a) => a.user_id === r.user_id);
                    return (
                      <li
                        key={r.user_id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                      >
                        <span className="min-w-0 truncate">
                          {r.display_name || "Unnamed"}{" "}
                          <span className="text-xs text-muted-foreground">{r.email}</span>
                        </span>
                        <button
                          onClick={() => assign(r, !on)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                            on
                              ? "border border-border text-muted-foreground"
                              : "bg-lime font-semibold text-primary-foreground"
                          }`}
                        >
                          {on ? "Assigned" : "Assign"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
