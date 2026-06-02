import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { findProfanityIn } from "@/lib/profanity";
import {
  loadBriefFormConfig,
  DEFAULT_BRIEF_FORM_CONFIG,
  type BriefFormConfig,
} from "@/lib/brief-form-config";

export const Route = createFileRoute("/_authenticated/connect")({
  head: () => ({
    meta: [
      { title: "Submit a brief — Create Racket" },
      {
        name: "description",
        content:
          "Plan your next campaign. Submit a brief and we'll match you with the right creative partners.",
      },
    ],
  }),
  component: ConnectPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Couldn't load the brief form: {error.message}</div>
  ),
});

const briefSchema = z.object({
  title: z.string().trim().min(2, "Add a title").max(160),
  description: z.string().trim().min(10, "Add a bit more detail").max(5000),
  budget: z
    .number({ invalid_type_error: "Enter a number" })
    .nonnegative("Must be 0 or more")
    .max(10_000_000)
    .optional(),
  timeline: z.string().trim().max(120).optional(),
  target_audience: z.string().trim().max(2000).optional(),
  contact_email: z.string().trim().email("Enter a valid email").max(320).optional(),
  collaboration_types: z.array(z.string()).max(20),
  core_values: z.array(z.string()),
});

function ConnectPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [config, setConfig] = useState<BriefFormConfig>(DEFAULT_BRIEF_FORM_CONFIG);

  useEffect(() => {
    loadBriefFormConfig().then(setConfig).catch(() => setConfig(DEFAULT_BRIEF_FORM_CONFIG));
  }, []);

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
      title: fd.get("title")?.toString() ?? "",
      description: fd.get("description")?.toString() ?? "",
      budget: budgetRaw ? Number(budgetRaw) : undefined,
      timeline: fd.get("timeline")?.toString() || undefined,
      target_audience: fd.get("target_audience")?.toString() || undefined,
      contact_email: fd.get("contact_email")?.toString() || undefined,
      collaboration_types: types,
      core_values: values,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    if (values.length > config.coreValuesMax) {
      toast.error(`You can pick up to ${config.coreValuesMax} core values`);
      return;
    }

    if (findProfanityIn(parsed.data)) {
      toast.error("Please remove offensive or inappropriate language from your brief before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Please sign in again");
        navigate({ to: "/login" });
        return;
      }
      const { error } = await supabase.from("campaign_briefs").insert({
        user_id: u.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        budget: parsed.data.budget ?? null,
        timeline: parsed.data.timeline ?? null,
        target_audience: parsed.data.target_audience ?? null,
        contact_email: parsed.data.contact_email ?? u.user.email ?? null,
        collaboration_types: parsed.data.collaboration_types,
        core_values: parsed.data.core_values,
      });
      if (error) throw error;
      toast.success(config.page.successMessage);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const f = config.fields;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 size-4" /> Back to dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{config.page.eyebrow}</p>
          <h1 className="mt-1 font-display text-4xl md:text-5xl">{config.page.heading}</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/20 p-3">
                <Link2 className="size-7 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">{config.page.cardTitle}</CardTitle>
                <CardDescription>{config.page.cardDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1 */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">{config.sections.core.title}</h3>
                  <p className="text-sm text-muted-foreground">{config.sections.core.description}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{f.title.label}</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder={f.title.placeholder}
                      required
                      maxLength={160}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{f.description.label}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder={f.description.placeholder}
                      rows={6}
                      required
                      maxLength={5000}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budget">{f.budget.label}</Label>
                      <Input
                        id="budget"
                        name="budget"
                        type="number"
                        min={0}
                        placeholder={f.budget.placeholder}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline">{f.timeline.label}</Label>
                      <Input
                        id="timeline"
                        name="timeline"
                        placeholder={f.timeline.placeholder}
                        maxLength={120}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Section 2 */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">{config.sections.vibe.title}</h3>
                  <p className="text-sm text-muted-foreground">{config.sections.vibe.description}</p>
                </div>
                <div className="space-y-2">
                  <Label>{config.coreValuesLabel}</Label>
                  <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-3">
                    {config.coreValues.map((value) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={values.includes(value)}
                          onCheckedChange={() => toggle(values, setValues, value, config.coreValuesMax)}
                        />
                        <span className="text-sm font-normal">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{config.collaborationTypesLabel}</Label>
                  <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                    {config.collaborationTypes.map((type) => (
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
                  <Label htmlFor="target_audience">{f.target_audience.label}</Label>
                  <Textarea
                    id="target_audience"
                    name="target_audience"
                    placeholder={f.target_audience.placeholder}
                    rows={3}
                    maxLength={2000}
                  />
                </div>
              </section>

              <Separator />

              {/* Section 3 */}
              <section className="space-y-6">
                <div>
                  <h3 className="font-display text-lg">{config.sections.contact.title}</h3>
                  <p className="text-sm text-muted-foreground">{config.sections.contact.description}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">{f.contact_email.label}</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    placeholder={f.contact_email.placeholder}
                    maxLength={320}
                  />
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={submitting}>
                  <Send className="mr-2 size-4" />
                  {submitting ? config.page.submittingLabel : config.page.submitLabel}
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
