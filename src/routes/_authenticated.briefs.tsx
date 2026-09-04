import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp, Archive } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartnerPageShares, type ShareProfile } from "@/components/admin/PartnerPageShares";
import { PartnerPageHistory } from "@/components/admin/PartnerPageHistory";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightForm } from "@/routes/_authenticated.admin";

export const Route = createFileRoute("/_authenticated/briefs")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    typeof search.edit === "string" ? { edit: search.edit } : {},
  head: () => ({
    meta: [
      { title: "Briefs — Create Racket" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BriefsPage,
});

type Brief = {
  id: string; slug: string; type: string; headline: string; subtitle: string | null;
  published: boolean; created_at: string; archived?: boolean | null;
  dashboard_visible?: boolean | null; dashboard_placement?: string | null;
};

function BriefsPage() {
  const navigate = useNavigate();
  const { edit: editSlug } = Route.useSearch();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<ShareProfile[]>([]);

  async function refresh() {
    const { data } = await supabase
      .from("partner_pages" as any)
      .select("*")
      .eq("section", "brief")
      .order("created_at", { ascending: false });
    setBriefs((data as unknown as Brief[]) ?? []);
  }

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
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .order("display_name", { ascending: true });
      setProfiles(((profileRows as any[]) ?? []) as ShareProfile[]);
      await refresh();
      // Deep-link from a public brief page's admin "Edit brief" button.
      if (editSlug) {
        const { data: editRow } = await supabase
          .from("partner_pages" as any)
          .select("*")
          .eq("section", "brief")
          .eq("slug", editSlug)
          .maybeSingle();
        if (editRow) {
          setEditing(editRow as any);
          setFormOpen(true);
        }
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setArchived(b: Brief, archived: boolean) {
    const { error } = await supabase
      .from("partner_pages" as any)
      .update({ archived, ...(archived ? { published: false } : {}) } as any)
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(archived ? "Brief archived" : "Brief restored");
    refresh();
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

  const active = briefs.filter((b) => !b.archived);
  const archived = briefs.filter((b) => !!b.archived);

  const renderCard = (b: Brief) => (
    <Card key={b.id}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">
              <button
                type="button"
                onClick={() => setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                  return next;
                })}
                className="inline-flex items-center gap-2 text-left hover:text-foreground/80"
              >
                {open.has(b.id) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                <span>{b.headline}</span>
              </button>
            </CardTitle>
            <CardDescription>
              /brief/{b.slug} · {b.type}{b.subtitle ? ` · ${b.subtitle}` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={b.archived ? "secondary" : b.published ? "default" : "outline"}>
              {b.archived ? "Archived" : b.published ? "Published" : "Draft"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={`/brief/${b.slug}`} target="_blank" rel="noreferrer">
                {b.published ? "View" : "Preview"} <ExternalLink className="ml-1 size-3" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { data } = await supabase
                  .from("partner_pages" as any)
                  .select("*")
                  .eq("id", b.id)
                  .maybeSingle();
                setEditing(data as any);
                setFormOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Pencil className="size-3" />
            </Button>
            <PartnerPageHistory pageId={b.id} pageTitle={b.headline} onRestored={refresh} />
            <Button size="sm" variant="outline" onClick={() => setArchived(b, !b.archived)}>
              <Archive className="size-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!confirm(`Delete brief "${b.headline}"?`)) return;
                const { error } = await supabase.from("partner_pages" as any).delete().eq("id", b.id);
                if (error) return toast.error(error.message);
                toast.success("Brief deleted");
                refresh();
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {open.has(b.id) ? (
        <CardContent className="space-y-3 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            Created {new Date(b.created_at).toLocaleDateString()}
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <Label htmlFor={`br-live-${b.id}`} className="text-sm font-medium">
                Live on all dashboards
              </Label>
              <p className="text-xs text-muted-foreground">
                {b.dashboard_visible
                  ? "Showing for every signed-in user."
                  : "Only people this brief is shared with will see it."}
              </p>
            </div>
            <Switch
              id={`br-live-${b.id}`}
              checked={!!b.dashboard_visible}
              disabled={!!b.archived}
              onCheckedChange={async (checked) => {
                setBriefs((rows) => rows.map((r) => (r.id === b.id ? { ...r, dashboard_visible: checked } : r)));
                const { error } = await supabase
                  .from("partner_pages" as any)
                  .update({ dashboard_visible: checked } as any)
                  .eq("id", b.id);
                if (error) {
                  setBriefs((rows) => rows.map((r) => (r.id === b.id ? { ...r, dashboard_visible: !checked } : r)));
                  toast.error(error.message);
                }
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <Label className="text-sm font-medium">Where it shows</Label>
              <p className="text-xs text-muted-foreground">
                Project planner by default. You can also push it into Featured spotlights.
              </p>
            </div>
            <Select
              value={b.dashboard_placement ?? "planner"}
              onValueChange={async (value) => {
                const prev = b.dashboard_placement ?? "planner";
                setBriefs((rows) => rows.map((r) => (r.id === b.id ? { ...r, dashboard_placement: value } : r)));
                const { error } = await supabase
                  .from("partner_pages" as any)
                  .update({ dashboard_placement: value } as any)
                  .eq("id", b.id);
                if (error) {
                  setBriefs((rows) => rows.map((r) => (r.id === b.id ? { ...r, dashboard_placement: prev } : r)));
                  toast.error(error.message);
                }
              }}
            >
              <SelectTrigger className="w-[210px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planner">Project planner</SelectItem>
                <SelectItem value="spotlight">Featured spotlights</SelectItem>
                <SelectItem value="both">Both sections</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PartnerPageShares partnerPageId={b.id} profiles={profiles} pageTitle={b.headline} pageLink={`/brief/${b.slug}`} eventKey="brief_shared" />
        </CardContent>
      ) : null}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">Briefs</h1>
            <p className="mt-2 text-muted-foreground">
              Same builder as spotlights, kept in its own section.
            </p>
          </div>
          <Button asChild variant="outline"><Link to="/admin">← Admin</Link></Button>
        </div>

        <div className="space-y-6">
          <Card>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                if (editing) {
                  setEditing(null);
                  setFormOpen(false);
                } else {
                  setFormOpen((v) => !v);
                }
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-display text-xl">
                    {editing ? "Edit brief" : "New brief"}
                  </CardTitle>
                  <CardDescription>
                    {editing ? `Updating /brief/${editing.slug}` : "Create a brief page. Lives at /brief/<slug>."}
                  </CardDescription>
                </div>
                {(formOpen || editing) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </CardHeader>
            </button>
            {(formOpen || editing) && (
              <CardContent>
                <SpotlightForm
                  key={editing?.id ?? "new"}
                  section="brief"
                  editData={editing}
                  onCreated={() => {
                    refresh();
                    setEditing(null);
                    setFormOpen(false);
                  }}
                  onCancel={() => {
                    setEditing(null);
                    setFormOpen(false);
                  }}
                />
              </CardContent>
            )}
          </Card>

          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No briefs yet.</p>
          ) : (
            <div className="space-y-4">{active.map(renderCard)}</div>
          )}

          {archived.length > 0 ? (
            <Card>
              <button type="button" className="w-full text-left" onClick={() => setArchiveOpen((v) => !v)}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-lg">Archived briefs ({archived.length})</CardTitle>
                  {archiveOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </CardHeader>
              </button>
              {archiveOpen ? (
                <CardContent className="space-y-4">{archived.map(renderCard)}</CardContent>
              ) : null}
            </Card>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
