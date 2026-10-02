import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/** Admin: every spotlight view request, plus manual sharing between users. */
export function SpotlightAccessPanel() {
  const qc = useQueryClient();
  const [pageId, setPageId] = useState("");
  const [userId, setUserId] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-spotlight-access"],
    queryFn: async () => {
      const [reqs, pages, profs] = await Promise.all([
        (supabase as any).from("spotlight_view_requests").select("id, status, created_at, partner_page_id, requester_id, owner_id").order("created_at", { ascending: false }),
        (supabase as any).from("partner_pages").select("id, headline, slug, linked_user_id").eq("section", "spotlight").eq("archived", false).order("headline"),
        (supabase as any).from("profiles").select("id, display_name, email").order("display_name"),
      ]);
      return {
        reqs: (reqs.data ?? []) as any[],
        pages: (pages.data ?? []) as any[],
        profiles: (profs.data ?? []) as any[],
      };
    },
  });
  const pageMap = new Map((data?.pages ?? []).map((p) => [p.id, p]));
  const nameOf = (id: string | null) => {
    const p = (data?.profiles ?? []).find((x) => x.id === id);
    return p ? p.display_name || p.email : "—";
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-spotlight-access"] });

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("spotlight_view_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("spotlight_view_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const share = async () => {
    const page = pageMap.get(pageId);
    if (!page || !userId) return;
    const { error } = await (supabase as any).from("spotlight_view_requests").upsert(
      { partner_page_id: pageId, requester_id: userId, owner_id: page.linked_user_id, status: "approved", decided_at: new Date().toISOString(), requester_seen: false },
      { onConflict: "partner_page_id,requester_id" },
    );
    if (error) return toast.error(error.message);
    toast.success("Spotlight shared");
    setUserId("");
    refresh();
  };

  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Spotlight view requests</CardTitle>
        <CardDescription>Requests from members to see someone's spotlight. Owners approve on their dashboard; you can override here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <span className="text-sm font-medium">Share</span>
          <select className={sel} value={pageId} onChange={(e) => setPageId(e.target.value)}>
            <option value="">Choose a spotlight…</option>
            {(data?.pages ?? []).map((p) => <option key={p.id} value={p.id}>{p.headline}</option>)}
          </select>
          <span className="text-sm">with</span>
          <select className={sel} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choose a user…</option>
            {(data?.profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name || p.email}</option>)}
          </select>
          <Button size="sm" disabled={!pageId || !userId} onClick={share}>Share</Button>
        </div>
        {!data?.reqs.length ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.reqs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm">
                <div>
                  <strong>{nameOf(r.requester_id)}</strong> → {pageMap.get(r.partner_page_id)?.headline ?? "Spotlight"}
                  <span className="text-muted-foreground"> (owner: {nameOf(r.owner_id)}) · {new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="ml-2 rounded-full border border-border/60 px-2 py-0.5 text-xs uppercase tracking-wider">{r.status}</span>
                </div>
                <div className="flex gap-1">
                  {r.status !== "approved" && <Button size="sm" onClick={() => setStatus(r.id, "approved")}>Approve</Button>}
                  {r.status !== "declined" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "declined")}>Decline</Button>}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
