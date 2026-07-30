import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  adminGrantAllowance,
  adminRecentProfiles,
  adminSetUsageBlocked,
  adminSetUsageLimit,
  adminUsageOverview,
} from "@/lib/usage.functions";

const ACTIONS = ["profile_sync", "vibe_intro", "voice_note"] as const;
type Action = (typeof ACTIONS)[number];

const ACTION_NAMES: Record<Action, string> = {
  profile_sync: "Profile syncs",
  vibe_intro: "Vibe check auto-fill",
  voice_note: "Brief voice notes",
};

type Overview = Awaited<ReturnType<typeof adminUsageOverview>>;
type RecentProfiles = Awaited<ReturnType<typeof adminRecentProfiles>>;

export function UsageAdmin() {
  const loadOverview = useServerFn(adminUsageOverview);
  const loadProfiles = useServerFn(adminRecentProfiles);
  const grant = useServerFn(adminGrantAllowance);
  const setBlocked = useServerFn(adminSetUsageBlocked);
  const setLimit = useServerFn(adminSetUsageLimit);

  const [data, setData] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<RecentProfiles["profiles"]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([loadOverview({ data: {} }), loadProfiles({ data: { limit: 25 } })]);
      setData(o);
      setRecent(p.profiles);
      const draft: Record<string, string> = {};
      o.limits.forEach((l) => (draft[l.action] = String(l.monthly_limit)));
      setLimitDraft(draft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load usage");
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadProfiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveLimit(action: Action) {
    const value = Number(limitDraft[action]);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a whole number");
      return;
    }
    setBusy(`limit-${action}`);
    try {
      await setLimit({ data: { action, monthlyLimit: Math.round(value) } });
      toast.success(`${ACTION_NAMES[action]} limit set to ${Math.round(value)}/month`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function addAllowance(userId: string, action: Action, amount: number) {
    setBusy(`grant-${userId}-${action}`);
    try {
      await grant({ data: { userId, action, amount } });
      toast.success("Allowance updated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlocked(userId: string, blocked: boolean) {
    setBusy(`block-${userId}`);
    try {
      await setBlocked({ data: { userId, blocked } });
      toast.success(blocked ? "Member blocked from AI actions" : "Member unblocked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading usage…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Period {data?.period}. Only AI-backed actions are metered — browsing, profiles and briefs are free.
        </p>
        <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly limits per member</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <div key={action} className="space-y-1.5">
              <Label htmlFor={`limit-${action}`}>{ACTION_NAMES[action]}</Label>
              <div className="flex gap-1.5">
                <Input
                  id={`limit-${action}`}
                  inputMode="numeric"
                  value={limitDraft[action] ?? ""}
                  onChange={(e) => setLimitDraft((d) => ({ ...d, [action]: e.target.value }))}
                />
                <Button size="sm" variant="outline" onClick={() => void saveLimit(action)} disabled={busy === `limit-${action}`}>
                  Save
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage this period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data?.users.length ? (
            <p className="text-sm text-muted-foreground">No metered activity yet this month.</p>
          ) : (
            data.users.map((u) => (
              <div key={u.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {u.name} {u.blocked ? <Badge variant="destructive" className="ml-1">Blocked</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={u.blocked ? "outline" : "ghost"}
                    onClick={() => void toggleBlocked(u.id, !u.blocked)}
                    disabled={busy === `block-${u.id}`}
                  >
                    {u.blocked ? <ShieldCheck className="mr-1.5 size-3.5" /> : <ShieldAlert className="mr-1.5 size-3.5" />}
                    {u.blocked ? "Unblock" : "Block AI actions"}
                  </Button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {ACTIONS.map((action) => {
                    const row = u.actions[action];
                    return (
                      <div key={action} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5 text-xs">
                        <span>
                          {ACTION_NAMES[action]}: <strong>{row?.count ?? 0}</strong>
                          {row?.bonus ? ` (+${row.bonus} bonus)` : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => void addAllowance(u.id, action, 1)}
                          disabled={busy === `grant-${u.id}-${action}`}
                        >
                          +1
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Newest member profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!recent.length ? (
            <p className="text-sm text-muted-foreground">No profiles yet.</p>
          ) : (
            recent.map((p) => (
              <div key={p.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {p.display_name || p.email || p.id.slice(0, 8)}{" "}
                    {p.account_type ? <Badge variant="secondary" className="ml-1">{p.account_type}</Badge> : null}
                    {p.usage_blocked ? <Badge variant="destructive" className="ml-1">Blocked</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.email ?? "—"}</p>
                  {p.bio ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <Button
                    size="sm"
                    variant={p.usage_blocked ? "outline" : "ghost"}
                    onClick={() => void toggleBlocked(p.id, !p.usage_blocked)}
                    disabled={busy === `block-${p.id}`}
                  >
                    {p.usage_blocked ? "Unblock" : "Block"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
