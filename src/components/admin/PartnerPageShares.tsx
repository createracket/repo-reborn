import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyEmailEvent } from "@/lib/email-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type ShareProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type ShareRow = {
  id: string;
  partner_page_id: string;
  target_user_id: string | null;
  target_email: string | null;
  created_at: string;
};

export function PartnerPageShares({
  partnerPageId,
  profiles,
  pageTitle,
  pageLink,
  eventKey = "brief_shared",
}: {
  partnerPageId: string;
  profiles: ShareProfile[];
  pageTitle?: string;
  pageLink?: string;
  eventKey?: string;
}) {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("partner_page_shares" as any)
      .select("id, partner_page_id, target_user_id, target_email, created_at")
      .eq("partner_page_id", partnerPageId)
      .order("created_at", { ascending: false });
    setShares(((data as any[]) ?? []) as ShareRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [partnerPageId]);

  const profileById = useMemo(() => {
    const m = new Map<string, ShareProfile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as ShareProfile[];
    const taken = new Set(shares.map((s) => s.target_user_id).filter(Boolean) as string[]);
    return profiles
      .filter(
        (p) =>
          !taken.has(p.id) &&
          ((p.display_name ?? "").toLowerCase().includes(q) ||
            (p.email ?? "").toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [query, profiles, shares]);

  async function addShare(patch: { target_user_id?: string | null; target_email?: string | null }) {
    setBusy(true);
    const { error } = await supabase.from("partner_page_shares" as any).insert({
      partner_page_id: partnerPageId,
      target_user_id: patch.target_user_id ?? null,
      target_email: patch.target_email ?? null,
    } as any);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuery("");
    setEmail("");
    toast.success("Shared");
    load();

    // Fires only if this trigger has a template assigned and is switched on.
    const target =
      patch.target_email ??
      profiles.find((p) => p.id === patch.target_user_id)?.email ??
      null;
    if (target) {
      const name = profiles.find((p) => p.id === patch.target_user_id)?.display_name ?? "";
      notifyEmailEvent({
        data: {
          eventKey,
          recipientEmail: target,
          templateData: { name, page_title: pageTitle ?? "", link: pageLink ?? "" },
        },
      } as any).catch(() => {});
    }
  }

  async function removeShare(id: string) {
    const prev = shares;
    setShares((s) => s.filter((r) => r.id !== id));
    const { error } = await supabase.from("partner_page_shares" as any).delete().eq("id", id);
    if (error) {
      setShares(prev);
      toast.error(error.message);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Show on specific user dashboards</div>
          <p className="text-xs text-muted-foreground">
            Recipients see this spotlight in their dashboard opportunities, even if it isn't live for everyone.
          </p>
        </div>
        {shares.length > 0 ? (
          <Badge variant="outline" className="text-[10px]">{shares.length} shared</Badge>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : shares.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {shares.map((s) => {
            const p = s.target_user_id ? profileById.get(s.target_user_id) : null;
            const label = p?.display_name || p?.email || s.target_email || "Unknown user";
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1 text-xs">
                <span className="truncate">
                  {label}
                  {s.target_user_id ? (
                    <span className="ml-1 text-muted-foreground">· account</span>
                  ) : (
                    <span className="ml-1 text-muted-foreground">· email invite</span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-destructive hover:text-destructive"
                  onClick={() => removeShare(s.id)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Label className="text-xs">Search accounts</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="h-8 text-sm"
          />
          {suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border/60 bg-popover shadow">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => addShare({ target_user_id: p.id })}
                  disabled={busy}
                >
                  {p.display_name ?? "Member"} <span className="text-muted-foreground">{p.email ?? ""}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <Label className="text-xs">Or invite by email</Label>
          <div className="flex gap-1">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@example.com"
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              type="button"
              disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
              onClick={() => addShare({ target_email: email.trim().toLowerCase() })}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
