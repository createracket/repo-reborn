import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ExternalLink, Trash2, Pencil } from "lucide-react";
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
import { adminCreateUser } from "@/lib/admin-users.functions";

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

          <TabsContent value="spotlights" className="mt-6 space-y-6">
            <SpotlightForm onCreated={refreshSpotlights} />
            {spotlights.length === 0 ? <Empty /> : (
              <div className="space-y-3">
                {spotlights.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{s.headline}</CardTitle>
                          <CardDescription>
                            /spotlight/{s.slug} · {s.type}
                            {s.subtitle ? ` · ${s.subtitle}` : ""}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.published ? "default" : "outline"}>
                            {s.published ? "Published" : "Draft"}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/spotlight/${s.slug}`} target="_blank" rel="noreferrer">
                              View <ExternalLink className="ml-1 size-3" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("partner_pages" as any)
                                .update({ published: !s.published })
                                .eq("id", s.id);
                              if (error) return toast.error(error.message);
                              toast.success(s.published ? "Unpublished" : "Published");
                              refreshSpotlights();
                            }}
                          >
                            {s.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!confirm(`Delete spotlight "${s.headline}"?`)) return;
                              const { error } = await supabase
                                .from("partner_pages" as any)
                                .delete()
                                .eq("id", s.id);
                              if (error) return toast.error(error.message);
                              toast.success("Deleted");
                              refreshSpotlights();
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>


          <TabsContent value="users" className="mt-6 space-y-6">
            <NewUserForm
              onCreated={async () => {
                const { data } = await supabase
                  .from("profiles")
                  .select("id, email, display_name, account_type, created_at")
                  .order("created_at", { ascending: false });
                setProfiles((data as Profile[]) ?? []);
              }}
            />
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

function ImageUploader({
  label, value, onChange, aspect, hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect: string;
  hint: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("spotlight-images").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("spotlight-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success(`${label} uploaded`);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="overflow-hidden rounded-md border border-border/60 bg-muted/40"
          style={{ width: 140, aspectRatio: aspect }}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {aspect}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          {value ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function SpotlightForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    type: "podcast",
    headline: "",
    subtitle: "",
    intro: "",
    host_bio: "",
    partnership_pitch: "",
    eoi_opportunities: "",
    audience_segments: "",
    instagram: "",
    spotify: "",
    spotifyEmbed: "",
    contact: "",
    header_image_url: "",
    profile_image_url: "",
    published: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug || !form.headline) {
      toast.error("Slug and headline are required");
      return;
    }
    setSaving(true);
    const slug = form.slug.toLowerCase().trim().replace(/\s+/g, "-");
    const payload = {
      slug,
      type: form.type || "podcast",
      headline: form.headline,
      subtitle: form.subtitle || null,
      intro: form.intro || null,
      host_bio: form.host_bio || null,
      partnership_pitch: form.partnership_pitch || null,
      eoi_opportunities: form.eoi_opportunities
        .split("\n").map((s) => s.trim()).filter(Boolean),
      audience_segments: form.audience_segments
        .split("\n").map((s) => s.trim()).filter(Boolean),
      links: {
        instagram: form.instagram,
        spotify: form.spotify,
        spotifyEmbed: form.spotifyEmbed,
        contact: form.contact,
      },
      header_image_url: form.header_image_url || null,
      profile_image_url: form.profile_image_url || null,
      published: form.published,
    };
    const { error } = await supabase.from("partner_pages" as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Spotlight created at /spotlight/${slug}`);
    setForm({
      slug: "", type: "podcast", headline: "", subtitle: "", intro: "",
      host_bio: "", partnership_pitch: "", eoi_opportunities: "", audience_segments: "",
      instagram: "", spotify: "", spotifyEmbed: "", contact: "",
      header_image_url: "", profile_image_url: "", published: false,
    });
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">New artist spotlight</CardTitle>
        <CardDescription>Create a partner page. Lives at /spotlight/&lt;slug&gt; with noindex.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ymyb-spotlight" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="podcast" />
          </div>
          <div className="md:col-span-2">
            <ImageUploader
              label="Header image"
              value={form.header_image_url}
              onChange={(url) => set("header_image_url", url)}
              aspect="16 / 9"
              hint="16:9 banner shown at the top of the spotlight page. JPG/PNG, up to 8MB."
            />
          </div>
          <div className="md:col-span-2">
            <ImageUploader
              label="Profile photo / artwork"
              value={form.profile_image_url}
              onChange={(url) => set("profile_image_url", url)}
              aspect="1 / 1"
              hint="Square headshot or cover artwork. JPG/PNG, up to 8MB."
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="headline">Headline *</Label>
            <Input id="headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Your Music, Your Business" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="UNLOCK REAL FAN INSIGHTS" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="intro">Intro</Label>
            <Textarea id="intro" rows={3} value={form.intro} onChange={(e) => set("intro", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="host_bio">Host bio</Label>
            <Textarea id="host_bio" rows={3} value={form.host_bio} onChange={(e) => set("host_bio", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="partnership_pitch">Partnership pitch</Label>
            <Textarea id="partnership_pitch" rows={3} value={form.partnership_pitch} onChange={(e) => set("partnership_pitch", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eoi">EOI opportunities (one per line)</Label>
            <Textarea id="eoi" rows={4} value={form.eoi_opportunities} onChange={(e) => set("eoi_opportunities", e.target.value)} placeholder={"Podcast sponsors\nBranded Content\nPodcast guests"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience segments (one per line)</Label>
            <Textarea id="audience" rows={4} value={form.audience_segments} onChange={(e) => set("audience_segments", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram URL</Label>
            <Input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spotify">Spotify URL</Label>
            <Input id="spotify" value={form.spotify} onChange={(e) => set("spotify", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spotifyEmbed">Spotify embed URL</Label>
            <Input id="spotifyEmbed" value={form.spotifyEmbed} onChange={(e) => set("spotifyEmbed", e.target.value)} placeholder="https://open.spotify.com/embed/show/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact (email or URL)</Label>
            <Input id="contact" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch id="published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
            <Label htmlFor="published" className="cursor-pointer">Publish immediately</Label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create spotlight"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    email_confirm: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || form.password.length < 8) {
      toast.error("Email and a password of at least 8 characters are required");
      return;
    }
    setSaving(true);
    try {
      await adminCreateUser({
        data: {
          email: form.email.trim(),
          password: form.password,
          display_name: form.display_name.trim() || undefined,
          email_confirm: form.email_confirm,
        },
      });
      toast.success(`Created ${form.email}`);
      setForm({ email: "", password: "", display_name: "", email_confirm: true });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Add a new user</CardTitle>
        <CardDescription>Manually provision an account. They can sign in immediately with the password you set.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="nu-email">Email</Label>
            <Input id="nu-email" type="email" autoComplete="off" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="nu-name">Display name (optional)</Label>
            <Input id="nu-name" value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="nu-password">Temporary password</Label>
            <Input id="nu-password" type="text" autoComplete="off" minLength={8} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="nu-confirm" checked={form.email_confirm}
              onCheckedChange={(v) => setForm((f) => ({ ...f, email_confirm: v }))} />
            <Label htmlFor="nu-confirm" className="cursor-pointer">Skip email verification</Label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create user"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

