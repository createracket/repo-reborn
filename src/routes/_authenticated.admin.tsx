import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type LeadBrief = {
  id: string; created_at: string; title: string; description: string;
  budget: number | null; timeline: string | null; core_values: string[];
  collaboration_types: string[]; target_audience: string | null;
  contact_email: string; contact_name: string | null; company: string | null;
  status: string;
};
type ContactMsg = { id: string; created_at: string; name: string; email: string; message: string; handled: boolean };
type Subscriber = { id: string; created_at: string; email: string; name: string | null; source: string; marketing_opt_in: boolean };
type Profile = { id: string; email: string | null; display_name: string | null; account_type: string | null; created_at: string };
type CampaignBrief = { id: string; created_at: string; title: string; description: string; user_id: string; budget: number | null; status: string; contact_email: string | null };

type Spotlight = {
  id: string; slug: string; type: string; headline: string; subtitle: string | null;
  published: boolean; created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leadBriefs, setLeadBriefs] = useState<LeadBrief[]>([]);
  const [contacts, setContacts] = useState<ContactMsg[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);

      const [lb, cm, ml, pr, cb, sp] = await Promise.all([
        supabase.from("lead_briefs").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
        supabase.from("mailing_list_subscribers").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email, display_name, account_type, created_at").order("created_at", { ascending: false }),
        supabase.from("campaign_briefs").select("id, created_at, title, description, user_id, budget, status, contact_email").order("created_at", { ascending: false }),
        supabase.from("partner_pages" as any).select("id, slug, type, headline, subtitle, published, created_at").order("created_at", { ascending: false }),
      ]);
      setLeadBriefs((lb.data as LeadBrief[]) ?? []);
      setContacts((cm.data as ContactMsg[]) ?? []);
      setSubs((ml.data as Subscriber[]) ?? []);
      setProfiles((pr.data as Profile[]) ?? []);
      setCampaigns((cb.data as CampaignBrief[]) ?? []);
      setSpotlights((sp.data as unknown as Spotlight[]) ?? []);
      setChecking(false);
    })();
  }, [navigate]);

  async function refreshSpotlights() {
    const { data } = await supabase
      .from("partner_pages" as any)
      .select("id, slug, type, headline, subtitle, published, created_at")
      .order("created_at", { ascending: false });
    setSpotlights((data as unknown as Spotlight[]) ?? []);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <p className="text-sm text-muted-foreground">Verifying access…</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-2xl">
                <ShieldAlert className="size-5 text-destructive" /> Restricted
              </CardTitle>
              <CardDescription>This area is admin-only.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-4xl md:text-5xl">Dev view</h1>
          <p className="mt-2 text-muted-foreground">Backend records across the platform.</p>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="leads">Lead briefs ({leadBriefs.length})</TabsTrigger>
            <TabsTrigger value="campaigns">Campaign briefs ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="spotlights">Spotlights ({spotlights.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({profiles.length})</TabsTrigger>
            <TabsTrigger value="contact">Contact ({contacts.length})</TabsTrigger>
            <TabsTrigger value="mailing">Mailing list ({subs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {leadBriefs.length === 0 ? <Empty /> : leadBriefs.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{b.title}</CardTitle>
                      <CardDescription>
                        {b.contact_name ?? "—"} · {b.contact_email} {b.company ? `· ${b.company}` : ""}
                      </CardDescription>
                    </div>
                    <Meta date={b.created_at} status={b.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">{b.description}</p>
                  <KV k="Budget" v={b.budget ? `£${b.budget}` : "—"} />
                  <KV k="Timeline" v={b.timeline ?? "—"} />
                  <KV k="Audience" v={b.target_audience ?? "—"} />
                  <KV k="Values" v={b.core_values?.join(", ") || "—"} />
                  <KV k="Collab" v={b.collaboration_types?.join(", ") || "—"} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6 space-y-3">
            {campaigns.length === 0 ? <Empty /> : campaigns.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{b.title}</CardTitle>
                      <CardDescription>{b.contact_email ?? b.user_id}</CardDescription>
                    </div>
                    <Meta date={b.created_at} status={b.status} />
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">{b.description}</p>
                  <KV k="Budget" v={b.budget ? `£${b.budget}` : "—"} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table headers={["Display name", "Email", "Type", "Joined"]}>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="p-3">{p.display_name ?? "—"}</td>
                      <td className="p-3">{p.email ?? "—"}</td>
                      <td className="p-3">{p.account_type ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-6 space-y-3">
            {contacts.length === 0 ? <Empty /> : contacts.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{m.name}</CardTitle>
                      <CardDescription>{m.email}</CardDescription>
                    </div>
                    <Meta date={m.created_at} status={m.handled ? "handled" : "new"} />
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">{m.message}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mailing" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table headers={["Email", "Name", "Source", "Opt-in", "Joined"]}>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t border-border/60">
                      <td className="p-3">{s.email}</td>
                      <td className="p-3">{s.name ?? "—"}</td>
                      <td className="p-3">{s.source}</td>
                      <td className="p-3">{s.marketing_opt_in ? "Yes" : "No"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No records yet.</p>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="text-xs"><span className="uppercase tracking-wider text-muted-foreground">{k}:</span> <span>{v}</span></div>;
}
function Meta({ date, status }: { date: string; status: string }) {
  return (
    <div className="text-right text-xs text-muted-foreground">
      <div>{new Date(date).toLocaleString()}</div>
      <div className="mt-1 inline-block rounded-full border border-border/60 px-2 py-0.5">{status}</div>
    </div>
  );
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40">
          <tr>{headers.map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
