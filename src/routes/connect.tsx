import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link2, Send, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
import { BRIEF_CURRENCIES, TRANSPARENCY_OPTIONS } from "@/lib/brief-currency";
import logo from "@/assets/CR-Logo-Half-Colour.png.asset.json";
import { VoiceNoteRecorder } from "@/components/briefs/VoiceNoteRecorder";

export const Route = createFileRoute("/connect")({
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
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const briefSchema = z.object({
  title: z.string().trim().min(2, "Add a title").max(160),
  description: z.string().trim().min(10, "Add a bit more detail").max(5000),
  budget: z
    .number({ invalid_type_error: "Enter a number" })
    .nonnegative("Must be 0 or more")
    .max(10_000_000)
    .optional(),
  currency: z.enum(["USD", "AUD", "GBP", "NZD"]).default("USD"),
  transparency: z
    .enum(["early_planning", "budget_pending", "locked_in", "live"])
    .optional(),
  timeline: z.string().trim().max(120).optional(),
  target_audience: z.string().trim().max(2000).optional(),
  contact_name: z.string().trim().min(2, "Add your name").max(120),
  company: z.string().trim().max(160).optional(),
  contact_email: z.string().trim().email("Enter a valid email").max(320),
  collaboration_types: z.array(z.string()).max(20),
  core_values: z.array(z.string()),
  additional_info: z.string().trim().max(5000).optional(),
});

type AccountKind = "brand" | "artist";
type CampaignKind = "seed" | "endorse" | "partner" | "unsure";

const ACCOUNT_OPTIONS: Array<{ value: AccountKind; label: string; desc: string }> = [
  { value: "brand", label: "Brand", desc: "I'm planning a campaign and want to collab with cool creators, including musicians." },
  { value: "artist", label: "Artist", desc: "I'm an artist looking to partner with brands and/or engage more fans directly." },
];

const UNSURE_OPTION: { value: CampaignKind; label: string; desc: string; tag: string } = {
  value: "unsure",
  label: "Unsure at this stage",
  tag: "Not sure yet",
  desc: "Not sure which service is the right fit? Tell us about your goals and we'll help you figure it out.",
};

const CAMPAIGN_OPTIONS_BRAND: Array<{ value: CampaignKind; label: string; desc: string; tag: string }> = [
  {
    value: "seed",
    label: "Seed",
    tag: "LOW-COST, EASY ENTRY",
    desc: "Gift awesome products and seed new campaign assets with relevant creators - reaching musicians, fans, and cultural tastemakers. ",
  },
  {
    value: "endorse",
    label: "Endorse",
    tag: "CAMPAIGN PLAN",
    desc: "Find the right talent to support your next brand campaign. Build a bespoke roster or ongoing ambassador program - leverage briefing tools and lightweight agreements.",
  },
  {
    value: "partner",
    label: "Partner",
    tag: "Bespoke",
    desc: "Custom collabs with tailored campaign tools and retained account management accounts - priority matching and paid media support. ",
  },
  UNSURE_OPTION,
];

const CAMPAIGN_OPTIONS_ARTIST: Array<{ value: CampaignKind; label: string; desc: string; tag: string }> = [
  {
    value: "seed",
    label: "Seed",
    tag: "LOW-COST, EASY ENTRY",
    desc: "Bring real fans into your next experience and grow your audience organically through a strategic sampling campaign. Gift music, merch and tickets to influential folks.",
  },
  {
    value: "endorse",
    label: "Endorse",
    tag: "CAMPAIGN COSTS",
    desc: "Proactively outreach to brand partners and/or build a bespoke roster to bolster your next release. Leverage creative briefing tools and build long-term partnerships.",
  },
  {
    value: "partner",
    label: "Partner",
    tag: "Bespoke",
    desc: "Custom collabs with tailored campaign tools and retained account management accounts - priority matching and paid media support.",
  },
  UNSURE_OPTION,
];

function ConnectPage() {
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [otherType, setOtherType] = useState("");
  const [config, setConfig] = useState<BriefFormConfig>(DEFAULT_BRIEF_FORM_CONFIG);
  const [submitted, setSubmitted] = useState<{ email: string; name: string; asUser: boolean } | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);
  const [campaignKind, setCampaignKind] = useState<CampaignKind | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [briefFile, setBriefFile] = useState<File | null>(null);

  useEffect(() => {
    loadBriefFormConfig().then(setConfig).catch(() => setConfig(DEFAULT_BRIEF_FORM_CONFIG));
    supabase.auth.getUser().then(({ data }) => setAuthedUserId(data.user?.id ?? null));
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
    if (!accountKind) {
      toast.error("Let us know if you're a brand or an artist");
      return;
    }
    if (!campaignKind) {
      toast.error("Pick the type of campaign you'd like to run");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const budgetRaw = fd.get("budget")?.toString().trim();

    const finalTypes = types.includes("Something else")
      ? [
          ...types.filter((t) => t !== "Something else"),
          otherType.trim() ? `Something else: ${otherType.trim()}` : "Something else",
        ]
      : types;

    const accountLabel = ACCOUNT_OPTIONS.find((o) => o.value === accountKind)?.label ?? accountKind;
    const campaignOptions = accountKind === "brand" ? CAMPAIGN_OPTIONS_BRAND : CAMPAIGN_OPTIONS_ARTIST;
    const campaignLabel = campaignOptions.find((o) => o.value === campaignKind)?.label ?? campaignKind;
    const rawExtra = fd.get("additional_info")?.toString().trim() ?? "";
    const preface = `Account type: ${accountLabel}\nCampaign type: ${campaignLabel}`;
    const combinedExtra = rawExtra ? `${preface}\n\n${rawExtra}` : preface;

    const parsed = briefSchema.safeParse({
      title: fd.get("title")?.toString() ?? "",
      description: fd.get("description")?.toString() ?? "",
      budget: budgetRaw ? Number(budgetRaw) : undefined,
      currency: (fd.get("currency")?.toString() as any) || "USD",
      transparency: (fd.get("transparency")?.toString() || undefined) as any,
      timeline: fd.get("timeline")?.toString() || undefined,
      target_audience: fd.get("target_audience")?.toString() || undefined,
      contact_name: fd.get("contact_name")?.toString() ?? "",
      company: fd.get("company")?.toString() || undefined,
      contact_email: fd.get("contact_email")?.toString() ?? "",
      collaboration_types: finalTypes,
      core_values: values,
      additional_info: combinedExtra,
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
      if (authedUserId) {
        const { error } = await supabase.from("campaign_briefs").insert({
          user_id: authedUserId,
          title: parsed.data.title,
          description: parsed.data.description,
          budget: parsed.data.budget ?? null,
          currency: parsed.data.currency,
          transparency: parsed.data.transparency ?? null,
          timeline: parsed.data.timeline ?? null,
          target_audience: parsed.data.target_audience ?? null,
          contact_email: parsed.data.contact_email,
          collaboration_types: parsed.data.collaboration_types,
          core_values: parsed.data.core_values,
          status: "submitted",
        } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lead_briefs").insert({
          title: parsed.data.title,
          description: parsed.data.description,
          budget: parsed.data.budget ?? null,
          currency: parsed.data.currency,
          transparency: parsed.data.transparency ?? null,
          timeline: parsed.data.timeline ?? null,
          target_audience: parsed.data.target_audience ?? null,
          contact_email: parsed.data.contact_email,
          contact_name: parsed.data.contact_name,
          company: parsed.data.company ?? null,
          collaboration_types: parsed.data.collaboration_types,
          core_values: parsed.data.core_values,
          additional_info: parsed.data.additional_info ?? null,
        } as any);
        if (error) throw error;
      }
      setSubmitted({
        email: parsed.data.contact_email,
        name: parsed.data.contact_name,
        asUser: Boolean(authedUserId),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubscribe() {
    if (!submitted) return;
    setSubscribing(true);
    try {
      const { error } = await supabase.from("mailing_list_subscribers").insert({
        email: submitted.email,
        name: submitted.name,
        source: "connect-waitlist",
        marketing_opt_in: true,
      });
      // Treat unique-violation as already-subscribed success.
      if (error && !/duplicate|unique/i.test(error.message)) throw error;
      setSubscribed(true);
      toast.success("You're on the waitlist — we'll be in touch.");
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't add you to the waitlist");
    } finally {
      setSubscribing(false);
    }
  }

  const f = config.fields;

  return (
    <div className="min-h-screen bg-background">
      {/* Isolated header: only logo links home, no nav */}
      <header className="border-b border-border/40">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center">
            <img src={logo.url} alt="Racket" className="h-8 w-auto" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" /> Back to home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        {submitted ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/20">
                <Check className="size-7 text-primary" />
              </div>
              <CardTitle className="font-display text-3xl">Brief received</CardTitle>
              <CardDescription className="text-base">
                Thanks {submitted.name.split(" ")[0]} — we'll review your brief and be in touch shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {submitted.asUser ? (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-6 text-center">
                  <h2 className="font-display text-2xl">Track it in your Project Planner</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your brief is now in your dashboard. We'll update the status as it moves through
                    review, roster and reporting.
                  </p>
                  <Button asChild className="mt-5" size="lg">
                    <Link to="/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    While you wait
                  </p>
                  <h2 className="mt-2 font-display text-2xl">Join the Create Racket waitlist</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Be first to access the platform, early-bird pricing, and curated artist
                    partnerships when we launch.
                  </p>
                  <Button
                    className="mt-5"
                    size="lg"
                    onClick={handleSubscribe}
                    disabled={subscribing || subscribed}
                  >
                    {subscribed ? (
                      <><Check className="mr-2 size-4" /> You're on the list</>
                    ) : subscribing ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Adding you…</>
                    ) : (
                      <>Subscribe with {submitted.email}</>
                    )}
                  </Button>
                </div>
              )}
              <div className="text-center">
                <Button asChild variant="ghost">
                  <Link to={submitted.asUser ? "/dashboard" : "/"}>
                    {submitted.asUser ? "Back to dashboard" : "Back to home"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {config.page.eyebrow}
              </p>
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
                  {/* Section 0a — Who's asking */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="font-display text-lg">Who's asking?</h3>
                      <p className="text-sm text-muted-foreground">
                        Tell us which side of the table you're on so we can tailor the brief.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {ACCOUNT_OPTIONS.map((opt) => {
                        const active = accountKind === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setAccountKind(opt.value)}
                            className={`rounded-lg border p-4 text-left transition ${
                              active
                                ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                                : "border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display text-base">{opt.label}</span>
                              {active && <Check className="size-4 text-primary" />}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {accountKind && (
                  <>
                  <Separator />

                  {/* Section 0b — Campaign type */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="font-display text-lg">What kind of campaign?</h3>
                      <p className="text-sm text-muted-foreground">
                        Pick the shape that fits best — you can refine the details below.
                      </p>
                    </div>
                    {(() => {
                      const opts = accountKind === "brand" ? CAMPAIGN_OPTIONS_BRAND : CAMPAIGN_OPTIONS_ARTIST;
                      const main = opts.filter((o) => o.value !== "unsure");
                      const unsure = opts.find((o) => o.value === "unsure");
                      const renderCard = (opt: typeof opts[number]) => {
                        const active = campaignKind === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCampaignKind(opt.value)}
                            className={`rounded-lg border p-4 text-left transition ${
                              active
                                ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                                : "border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-base">{opt.label}</span>
                              {active ? (
                                <Check className="size-4 text-primary" />
                              ) : (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {opt.tag}
                                </span>
                              )}
                            </div>
                            {active && (
                              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                                {opt.tag}
                              </span>
                            )}
                            <p className="mt-2 text-sm text-muted-foreground">{opt.desc}</p>
                          </button>
                        );
                      };
                      return (
                        <>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {main.map(renderCard)}
                          </div>
                          {unsure && (
                            <div className="grid grid-cols-1 gap-3 pt-3">
                              {renderCard(unsure)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </section>

                  <Separator />

                  {/* Section 1 */}
                  <section className="space-y-6">
                    <div>
                      <h3 className="font-display text-lg">{config.sections.core.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.sections.core.description}
                      </p>
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
                          <div className="flex gap-2">
                            <select
                              id="currency"
                              name="currency"
                              defaultValue="USD"
                              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              {BRIEF_CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <Input
                              id="budget"
                              name="budget"
                              type="number"
                              min={0}
                              placeholder={f.budget.placeholder}
                              className="flex-1"
                            />
                          </div>
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
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="transparency">Project transparency</Label>
                          <p className="text-xs text-muted-foreground">
                            Help us gauge how far along the project is.
                          </p>
                          <select
                            id="transparency"
                            name="transparency"
                            defaultValue=""
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select a stage…</option>
                            {TRANSPARENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 2 */}
                  <section className="space-y-6">
                    <div>
                      <h3 className="font-display text-lg">{config.sections.vibe.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.sections.vibe.description}
                      </p>
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
                              onCheckedChange={() =>
                                toggle(values, setValues, value, config.coreValuesMax)
                              }
                            />
                            <span className="text-sm font-normal">{value}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{config.collaborationTypesLabel}</Label>
                      {(() => {
                        const source = (accountKind === "brand" && config.collaborationTypesBrand && config.collaborationTypesBrand.length > 0)
                          ? config.collaborationTypesBrand
                          : config.collaborationTypes;
                        const seen = new Set<string>();
                        const deduped = source.filter((t) => {
                          const key = t.trim().toLowerCase();
                          if (seen.has(key)) return false;
                          seen.add(key);
                          return true;
                        });
                        const isSpecial = (t: string) => {
                          const k = t.trim().toLowerCase();
                          return k === "all of the above" || k === "something else";
                        };
                        const main = deduped.filter((t) => !isSpecial(t));
                        const hasAll = deduped.some((t) => t.trim().toLowerCase() === "all of the above");
                        return (
                          <>
                            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                              {main.map((type) => (
                                <label
                                  key={type}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40"
                                >
                                  <Checkbox
                                    checked={types.includes(type)}
                                    onCheckedChange={() => toggle(types, setTypes, type)}
                                  />
                                  <span className="whitespace-pre-line text-sm font-normal">{type}</span>
                                </label>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-3">
                              {hasAll && (
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40">
                                  <Checkbox
                                    checked={types.includes("All of the above")}
                                    onCheckedChange={() => toggle(types, setTypes, "All of the above")}
                                  />
                                  <span className="text-sm font-normal">All of the above</span>
                                </label>
                              )}
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 hover:bg-muted/40">
                                <Checkbox
                                  checked={types.includes("Something else")}
                                  onCheckedChange={() => toggle(types, setTypes, "Something else")}
                                />
                                <span className="text-sm font-normal">Something else</span>
                              </label>
                            </div>
                          </>
                        );
                      })()}
                      {types.includes("Something else") && (
                        <Input
                          value={otherType}
                          onChange={(e) => setOtherType(e.target.value)}
                          placeholder="Tell us what you have in mind"
                          maxLength={200}
                        />
                      )}
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
                      <p className="text-sm text-muted-foreground">
                        {config.sections.contact.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Your name</Label>
                        <Input
                          id="contact_name"
                          name="contact_name"
                          placeholder="Vinnie Bones"
                          required
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company (optional)</Label>
                        <Input
                          id="company"
                          name="company"
                          placeholder="Brand or agency"
                          maxLength={160}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">{f.contact_email.label}</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        placeholder={f.contact_email.placeholder}
                        required
                        maxLength={320}
                      />
                    </div>
                  </section>

                  <Separator />

                  {/* Section 4 — Anything else */}
                  <section className="space-y-6">
                    <div>
                      <h3 className="font-display text-lg">{config.sections.extras.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.sections.extras.description}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additional_info">{f.additional_info.label}</Label>
                      <VoiceNoteRecorder
                        onTranscribed={(text) =>
                          setAdditionalInfo((prev) => {
                            const trimmed = prev.trim();
                            const next = trimmed ? `${trimmed}\n\n${text}` : text;
                            return next.slice(0, 5000);
                          })
                        }
                      />
                      <Textarea
                        id="additional_info"
                        name="additional_info"
                        placeholder={f.additional_info.placeholder}
                        rows={5}
                        maxLength={5000}
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                      />
                    </div>
                  </section>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="lg" disabled={submitting}>
                      <Send className="mr-2 size-4" />
                      {submitting ? config.page.submittingLabel : config.page.submitLabel}
                    </Button>
                  </div>
                  </>
                  )}
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Minimal footer — no nav */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Create Racket
      </footer>
    </div>
  );
}
