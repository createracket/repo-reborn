import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Create Racket" },
      {
        name: "description",
        content:
          "Create Racket membership tiers — Free, Starter, Pro and Ambassador. Compare features and find the right tier for artists building brand partnerships.",
      },
      { property: "og:title", content: "Pricing — Create Racket" },
      {
        property: "og:description",
        content: "Membership tiers for artists building brand partnerships with Create Racket.",
      },
    ],
  }),
  component: PricingPage,
});

type Tier = "free" | "starter" | "pro" | "ambassador";

const tierTint: Record<Tier, string> = {
  free: "bg-card text-foreground",
  starter: "bg-primary/15 text-foreground",
  pro: "bg-purple/25 text-foreground",
  ambassador: "bg-pink-accent/25 text-foreground",
};

const tierAccent: Record<Tier, string> = {
  free: "border-l-4 border-l-muted-foreground/40",
  starter: "border-l-4 border-l-primary",
  pro: "border-l-4 border-l-purple",
  ambassador: "border-l-4 border-l-pink-accent",
};

type Row = {
  label: string;
  values: Record<Tier, { tick?: boolean; dash?: boolean; text?: string }>;
};

type Section = { label: string; heading: string; rows: Row[] };

const sections: Section[] = [
  {
    label: "Profile",
    heading: "Profile & network access",
    rows: [
      {
        label: "Artist profile",
        values: {
          free: { tick: true, text: "Basic — name, genre, bio, links" },
          starter: { tick: true, text: "Full profile + portfolio uploads" },
          pro: { tick: true, text: "Full profile + brand-ready media kit" },
          ambassador: { tick: true, text: "Managed — Racket edits on your behalf" },
        },
      },
      {
        label: "Community",
        values: {
          free: { dash: true, text: "Read-only access" },
          starter: { tick: true, text: "Full community access" },
          pro: { tick: true, text: "Full + priority channels" },
          ambassador: { tick: true, text: "Full + private ambassador cohort" },
        },
      },
      {
        label: "Brand briefings",
        values: {
          free: { dash: true },
          starter: { tick: true, text: "Monthly digest" },
          pro: { tick: true, text: "Monthly + early access" },
          ambassador: { tick: true, text: "Direct briefings, Racket pitches you" },
        },
      },
    ],
  },
  {
    label: "Education",
    heading: "Education & brand-readiness tools",
    rows: [
      {
        label: "Resource library",
        values: {
          free: { dash: true },
          starter: { tick: true, text: "Guides on briefs, gifting + affiliate" },
          pro: { tick: true, text: "Full library + advanced brand strategy" },
          ambassador: { tick: true, text: "All resources + bespoke briefing prep" },
        },
      },
      {
        label: "Templates",
        values: {
          free: { dash: true },
          starter: { tick: true, text: "Pitch deck, bio + rate card" },
          pro: { tick: true, text: "Templates + brief response + content guides" },
          ambassador: { tick: true, text: "Racket builds assets on your behalf" },
        },
      },
      {
        label: "1:1 strategy",
        values: {
          free: { dash: true },
          starter: { dash: true },
          pro: { tick: true, text: "Quarterly brand strategy session" },
          ambassador: { tick: true, text: "Ongoing — Racket manages strategy" },
        },
      },
    ],
  },
  {
    label: "Deals",
    heading: "Brand partnership opportunities",
    rows: [
      {
        label: "Seeded product",
        values: {
          free: { dash: true, text: "Not eligible" },
          starter: { tick: true, text: "Eligible for gifted campaigns" },
          pro: { tick: true, text: "Priority matching to live briefs" },
          ambassador: { tick: true, text: "Proactively matched by Racket" },
        },
      },
      {
        label: "Endorsed placement",
        values: {
          free: { dash: true },
          starter: { dash: true },
          pro: { tick: true, text: "Promo codes + affiliate commission" },
          ambassador: { tick: true, text: "Racket negotiates + manages" },
        },
      },
      {
        label: "Ambassadorship",
        values: {
          free: { dash: true },
          starter: { dash: true },
          pro: { dash: true },
          ambassador: { tick: true, text: "Named deal, retainer + co-creation" },
        },
      },
    ],
  },
];

const tiers: Tier[] = ["free", "starter", "pro", "ambassador"];

function Cell({ tier, value }: { tier: Tier; value: Row["values"][Tier] }) {
  return (
    <div className={cn("p-3 text-xs leading-relaxed border-r border-b border-border last:border-r-0", tierTint[tier])}>
      {value.tick && <span className="mr-1 text-primary font-semibold">✓</span>}
      {value.dash && <span className="mr-1 text-muted-foreground">–</span>}
      {value.text}
    </div>
  );
}

function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Membership</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            PICK YOUR <span className="text-gradient-racket">TIER</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Find the right tier for where you are as an artist — from getting on the
            radar to a fully managed ambassador partnership.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "px-5 py-1.5 text-sm rounded-full transition-colors font-headline tracking-wide",
                !annual
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              MONTHLY
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "px-5 py-1.5 text-sm rounded-full transition-colors font-headline tracking-wide",
                annual
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ANNUAL
            </button>
          </div>
          {annual && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              2 months free — save 17%
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/30">
          <div
            className="min-w-[860px] grid"
            style={{ gridTemplateColumns: "170px repeat(4, 1fr)" }}
          >
            {/* Header row */}
            <div className="border-r border-b border-border bg-card" />
            {tiers.map((t) => {
              const meta: Record<Tier, { name: string; price: React.ReactNode }> = {
                free: { name: "Free", price: <div className="text-xs text-muted-foreground">Always free</div> },
                starter: {
                  name: "Starter",
                  price: annual ? (
                    <div className="text-[11px] text-muted-foreground">$200 / year · ≈ $16.67/mo</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">$20 / month</div>
                  ),
                },
                pro: {
                  name: "Pro",
                  price: annual ? (
                    <div className="text-[11px] text-muted-foreground">$500 / year · ≈ $41.67/mo</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">$50 / month</div>
                  ),
                },
                ambassador: {
                  name: "Ambassador",
                  price: (
                    <div className="text-xs text-muted-foreground">
                      Application only{annual && <span className="block text-[11px]">Retainer — bespoke</span>}
                    </div>
                  ),
                },
              };
              const isLast = t === "ambassador";
              return (
                <div
                  key={t}
                  className={cn(
                    "p-4 border-b border-border",
                    !isLast && "border-r",
                    tierTint[t],
                    tierAccent[t]
                  )}
                >
                  <div className="font-headline text-base tracking-wide">{meta[t].name.toUpperCase()}</div>
                  <div className="mt-1">{meta[t].price}</div>
                </div>
              );
            })}

            {sections.map((section) => (
              <SectionBlock key={section.label} section={section} />
            ))}

            {/* Racket earns */}
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary border-r border-b border-border bg-card flex items-center">
              Racket earns
            </div>
            <div className="col-span-4 bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary border-b border-border">
              Revenue at each tier
            </div>
            <div className="px-3 py-2.5 text-xs font-medium text-muted-foreground border-r border-border bg-card flex items-center">
              Model
            </div>
            {([
              ["free", "First-party data on the wider artist pool — fuels brand matching + conversion."],
              ["starter", annual
                ? "$200/yr subscription. Improved retention + cash flow predictability."
                : "$20/mo subscription. Scales with roster. Low cost to serve."],
              ["pro", annual
                ? "$500/yr sub + small % of affiliate commission on Tier 2 deals."
                : "$50/mo sub + small % of affiliate commission on Tier 2 deals."],
              ["ambassador", "15–20% agency fee on brand retainer negotiated for artist."],
            ] as Array<[Tier, string]>).map(([t, text], i) => (
              <div
                key={t}
                className={cn("p-3", tierTint[t], i < 3 && "border-r border-border")}
              >
                <div className="rounded-md bg-background/40 px-2 py-1.5 text-[11px] leading-relaxed">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discount bar */}
        <div className="mt-8 rounded-2xl border border-pink-accent/40 bg-pink-accent/10 p-6 text-sm">
          <div className="font-headline text-base tracking-wide text-pink-accent mb-2">
            ACCESS SUPPORT — WORKING CLASS, LOW INCOME + MINORITY ARTISTS
          </div>
          <p className="mb-3 text-foreground/85 leading-relaxed">
            Racket offers 1–3 months of free paid tier access to artists who would
            otherwise face barriers to entry. This is a core part of how we build a
            genuinely diverse, representative roster — which in turn makes Create
            Racket a more compelling and credible offer to brands.
          </p>
          <ul className="space-y-1.5 text-foreground/85">
            <li className="flex gap-2">
              <span className="text-pink-accent">→</span>
              <span><strong className="font-medium text-foreground">1 month free</strong> — self-declared low income or working class artists, applied at signup</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-accent">→</span>
              <span><strong className="font-medium text-foreground">2 months free</strong> — artists from underrepresented or minority backgrounds</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-accent">→</span>
              <span><strong className="font-medium text-foreground">3 months free</strong> — artists meeting both criteria, or referred via a partner organisation</span>
            </li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <>
      <div className="bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary border-r border-b border-border flex items-center">
        {section.label}
      </div>
      <div className="col-span-4 bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary border-b border-border">
        {section.heading}
      </div>
      {section.rows.map((row) => (
        <Fragment key={`${section.label}-${row.label}`}>
          <div className="px-3 py-2.5 text-xs font-medium text-foreground/80 border-r border-b border-border bg-card flex items-center">
            {row.label}
          </div>
          {tiers.map((t) => (
            <Cell key={`${section.label}-${row.label}-${t}`} tier={t} value={row.values[t]} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
