import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Link2, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/submit-brief")({
  head: () => ({
    meta: [
      { title: "Submit a brief — Create Racket" },
      {
        name: "description",
        content:
          "Got a campaign in mind? Submit a brief and we'll match you with the right creative partners — no account required.",
      },
    ],
  }),
  component: SubmitBriefPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Couldn't load the brief form: {error.message}</div>
  ),
});

const COLLABORATION_TYPES = [
  "Social Media Campaign",
  "Live Performance",
  "Content Creation",
  "Brand Ambassadorship",
  "Merchandise Collaboration",
  "Sponsored Song/Video",
] as const;

const CORE_VALUES = [
  "Authenticity",
  "Creativity",
  "Community",
  "Sustainability",
  "Innovation",
  "Inclusivity",
] as const;

const briefSchema = z.object({
  contact_name: z.string().trim().min(1, "Add your name").max(120).optional(),
  company: z.string().trim().max(160).optional(),
  contact_email: z.string().trim().email("Enter a valid email").max(320),
  title: z.string().trim().min(2, "Add a title").max(200),
  description: z.string().trim().min(10, "Add a bit more detail").max(5000),
  budget: z
    .number({ invalid_type_error: "Enter a number" })
    .nonnegative("Must be 0 or more")
    .max(10_000_000)
    .optional(),
  timeline: z.string().trim().max(120).optional(),
  target_audience: z.string().trim().max(2000).optional(),
  collaboration_types: z.array(z.string()).max(10),
  core_values: z.array(z.string()).max(3, "Pick up to 3"),
});

function SubmitBriefPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  function toggle(list: string[], setList: (v: string[]) => void, item: string, max?: number) {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      if (max && list.length >= max) {
        toast.error(`You can pick up to ${max}`);
        return;
      }
      setList([...list, item]);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const budgetRaw = fd.get("budget")?.toString().trim();

    const parsed = briefSchema.safeParse({
      contact_name: fd.get("contact_name")?.toString() || undefined,
      company: fd.get("company")?.toString() || undefined,
      contact_email: fd.get("contact_email")?.toString() ?? "",
      title: fd.get("title")?.toString() ?? "",
      description: fd.get("description")?.toString() ?? "",
      budget: budgetRaw ? Number(budgetRaw) : undefined,
      timeline: fd.get("timeline")?.toString() || undefined,
      target_audience: fd.get("target_audience")?.toString() || undefined,
      collaboration_types: types,
      core_values: values,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    if (findProfanityIn(parsed.data)) {
      toast.error("Please remove offensive or inappropriate language from your brief before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("lead_briefs").insert({
        title: parsed.data.title,
        description: parsed.data.description,
        budget: parsed.data.budget ?? null,
        timeline: parsed.data.timeline ?? null,
        target_audience: parsed.data.target_audience ?? null,
        contact_email: parsed.data.contact_email,
        contact_name: parsed.data.contact_name ?? null,
        company: parsed.data.company ?? null,
        collaboration_types: parsed.data.collaboration_types,
        core_values: parsed.data.core_values,
      });
      if (error) throw error;
      toast.success("Brief submitted! We'll be in touch shortly.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 size-4" /> Back home
          </Link>
        </Button>

        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Connect</p>
          <h1 className="mt-1 font-display text-4xl md:text-5xl">Submit a brief</h1>
          <p className="mt-3 text-muted-foreground">
            No account needed. Tell us about your campaign and we'll be in touch. Want to go deeper?{" "}
            <Link to="/vibe-check" className="underline underline-offset-4">
              Take the Vibe Check
            </Link>
            .
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/20 p-3">
                <Link2 className="size-7 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Plan your next campaign</CardTitle>
                <CardDescription>
                  Tell us about the project and we'll match you with creative partners who fit your vibe.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">About you</h3>
                  <p className="text-sm text-muted-foreground">So we know who we're talking to.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Your name</Label>
                    <Input id="contact_name" name="contact_name" placeholder="Jane Doe" maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company / brand</Label>
                    <Input id="company" name="company" placeholder="Acme Co." maxLength={160} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact email</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    maxLength={320}
                  />
                </div>
              </section>

              <Separator />

              {/* Section 1 */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">Core campaign details</h3>
                  <p className="text-sm text-muted-foreground">Start with the basics.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Campaign title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Summer Vibes album launch"
                      required
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Project description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your goals, who you're trying to reach, and what you're looking for in a partner…"
                      rows={6}
                      required
                      maxLength={5000}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Estimated budget ($)</Label>
                      <Input id="budget" name="budget" type="number" min={0} placeholder="e.g., 10000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline">Timeline</Label>
                      <Input id="timeline" name="timeline" placeholder="e.g., 3 months" maxLength={120} />
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Section 2 */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">The vibe check</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us find the perfect match by describing the vibe you're going for.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Ideal partner's core values (pick up to 3)</Label>
                  <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-3">
                    {CORE_VALUES.map((value) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={values.includes(value)}
                          onCheckedChange={() => toggle(values, setValues, value, 3)}
                        />
                        <span className="text-sm font-normal">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Collaboration type</Label>
                  <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                    {COLLABORATION_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={types.includes(type)}
                          onCheckedChange={() => toggle(types, setTypes, type)}
                        />
                        <span className="text-sm font-normal">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_audience">Describe your target audience</Label>
                  <Textarea
                    id="target_audience"
                    name="target_audience"
                    placeholder="e.g., Ages 18–25, into indie music, sustainable fashion, outdoor scenes."
                    rows={3}
                    maxLength={2000}
                  />
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={submitting}>
                  <Send className="mr-2 size-4" />
                  {submitting ? "Submitting…" : "Submit brief"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
