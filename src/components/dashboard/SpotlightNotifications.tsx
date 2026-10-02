import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Req = {
  id: string;
  status: string;
  requester_id: string;
  owner_id: string | null;
  requester_seen: boolean;
  partner_page_id: string;
  page: { headline: string; slug: string } | null;
  requester_name: string | null;
};

/** Spotlight view requests for the signed-in user. Renders nothing when empty. */
export function SpotlightNotifications() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["spotlight-notifications", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Req[]> => {
      const { data: rows } = await (supabase as any)
        .from("spotlight_view_requests")
        .select("id, status, requester_id, owner_id, requester_seen, partner_page_id, partner_pages(headline, slug)")
        .or(`and(owner_id.eq.${userId},status.eq.pending),and(requester_id.eq.${userId},status.eq.approved,requester_seen.eq.false)`)
        .order("created_at", { ascending: false });
      const list = (rows ?? []) as any[];
      const ids = [...new Set(list.filter((r) => r.owner_id === userId).map((r) => r.requester_id))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await (supabase as any).from("public_profiles").select("id, display_name, artist_name").in("id", ids);
        for (const p of profs ?? []) names.set(p.id, p.artist_name || p.display_name);
      }
      return list.map((r) => ({ ...r, page: r.partner_pages ?? null, requester_name: names.get(r.requester_id) ?? null }));
    },
  });
  if (!data.length) return null;

  const update = async (id: string, patch: Record<string, unknown>, msg?: string) => {
    const { error } = await (supabase as any).from("spotlight_view_requests").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (msg) toast.success(msg);
    qc.invalidateQueries({ queryKey: ["spotlight-notifications"] });
  };

  return (
    <div className="lg:col-span-3">
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Bell className="size-5 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.map((r) =>
            r.owner_id === userId ? (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <p className="text-sm">
                  <strong>{r.requester_name ?? "A Racket member"}</strong> asked to see your spotlight
                  {r.page ? <> “{r.page.headline}”</> : null}.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => update(r.id, { status: "approved" }, "Access approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => update(r.id, { status: "declined" }, "Request declined")}>Decline</Button>
                </div>
              </div>
            ) : (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <p className="text-sm">You can now view the spotlight “{r.page?.headline}”.</p>
                <div className="flex gap-2">
                  {r.page ? (
                    <Button asChild size="sm" onClick={() => update(r.id, { requester_seen: true })}>
                      <Link to="/spotlight/$slug" params={{ slug: r.page.slug }}>View spotlight</Link>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => update(r.id, { requester_seen: true })}>Dismiss</Button>
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  );
}
