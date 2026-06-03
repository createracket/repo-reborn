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
    <div className={cn("p-3 text-xs leading-relaxed border-r border-b border-border/40 last:border-r-0", tierTint[tier])}>
      {value.tick && <span className="text-[#1D9E75] mr-1">✓</span>}
      {value.dash && <span className="text-muted-foreground mr-1">–</span>}
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
          <h1 className="font-display text-4xl">MEMBERSHIP TIERS</h1>
          <p className="mt-3 text-muted-foreground">
            Find the right tier for where you are as an artist — from getting on the
            radar to a fully managed ambassador partnership.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition-colors",
                !annual ? "bg-background text-foreground font-medium shadow-sm" : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition-colors",
                annual ? "bg-background text-foreground font-medium shadow-sm" : "text-muted-foreground"
              )}
            >
              Annual
            </button>
          </div>
          {annual && (
            <span className="rounded-full bg-[#E1F5EE] px-3 py-1 text-xs font-medium text-[#085041] dark:bg-[#085041] dark:text-[#9FE1CB]">
              2 months free — save 17%
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div
            className="min-w-[860px] rounded-xl border border-border overflow-hidden grid"
            style={{ gridTemplateColumns: "160px repeat(4, 1fr)" }}
          >
            {/* Header row */}
            <div className="border-r border-b border-border bg-muted" />
            <div className={cn("p-3 border-r border-b border-border", tierTint.free)}>
              <div className="text-sm font-medium">Free</div>
              <div className="text-xs opacity-75">Always free</div>
            </div>
            <div className={cn("p-3 border-r border-b border-border", tierTint.starter)}>
              <div className="text-sm font-medium">Starter</div>
              {annual ? (
                <div className="text-[11px] opacity-70">$200 / year · equiv. $16.67/mo</div>
              ) : (
                <div className="text-xs opacity-75">$20 / month</div>
              )}
            </div>
            <div className={cn("p-3 border-r border-b border-border", tierTint.pro)}>
              <div className="text-sm font-medium">Pro</div>
              {annual ? (
                <div className="text-[11px] opacity-70">$500 / year · equiv. $41.67/mo</div>
              ) : (
                <div className="text-xs opacity-75">$50 / month</div>
              )}
            </div>
            <div className={cn("p-3 border-b border-border", tierTint.ambassador)}>
              <div className="text-sm font-medium">Ambassador</div>
              <div className="text-xs opacity-75">Application only</div>
              {annual && <div className="text-[11px] opacity-70">Retainer — bespoke</div>}
            </div>

            {sections.map((section) => (
              <SectionBlock key={section.label} section={section} />
            ))}

            {/* Racket earns */}
            <div className="col-span-5 grid" style={{ gridTemplateColumns: "subgrid" }}>
              <div className="bg-muted/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-r border-b border-border flex items-center">
                Racket earns
              </div>
              <div className="col-span-4 bg-muted/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border">
                Revenue at each tier
              </div>
            </div>
            <div className="px-3 py-2.5 text-xs font-medium text-muted-foreground border-r border-border bg-muted flex items-center">
              Model
            </div>
            <div className={cn("p-3 border-r border-border", tierTint.free)}>
              <div className="rounded-md bg-background/40 px-2 py-1.5 text-[11px] leading-relaxed">
                First-party data on the wider artist pool — fuels brand matching + conversion.
              </div>
            </div>
            <div className={cn("p-3 border-r border-border", tierTint.starter)}>
              <div className="rounded-md bg-background/40 px-2 py-1.5 text-[11px] leading-relaxed">
                {annual
                  ? "$200/yr subscription. Improved retention + cash flow predictability."
                  : "$20/mo subscription. Scales with roster. Low cost to serve."}
              </div>
            </div>
            <div className={cn("p-3 border-r border-border", tierTint.pro)}>
              <div className="rounded-md bg-background/40 px-2 py-1.5 text-[11px] leading-relaxed">
                {annual
                  ? "$500/yr sub + small % of affiliate commission on Tier 2 deals."
                  : "$50/mo sub + small % of affiliate commission on Tier 2 deals."}
              </div>
            </div>
            <div className={cn("p-3", tierTint.ambassador)}>
              <div className="rounded-md bg-background/40 px-2 py-1.5 text-[11px] leading-relaxed">
                15–20% agency fee on brand retainer negotiated for artist.
              </div>
            </div>
          </div>
        </div>

        {/* Discount bar */}
        <div className="mt-6 rounded-xl border border-[#EF9F27] bg-[#FAEEDA] p-4 text-sm text-[#633806] dark:border-[#854F0B] dark:bg-[#412402] dark:text-[#FAC775]">
          <strong className="block mb-1 text-[15px] font-medium">
            Access support — working class, low income + minority artists
          </strong>
          <p className="mb-2">
            Racket offers 1–3 months of free paid tier access to artists who would
            otherwise face barriers to entry. This is a core part of how we build a
            genuinely diverse, representative roster — which in turn makes Create
            Racket a more compelling and credible offer to brands.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="font-medium">1 month free</strong> — self-declared low income or working class artists, applied at signup
            </li>
            <li>
              <strong className="font-medium">2 months free</strong> — artists from underrepresented or minority backgrounds
            </li>
            <li>
              <strong className="font-medium">3 months free</strong> — artists meeting both criteria, or referred via a partner organisation
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
      <div className="bg-muted/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-r border-b border-border flex items-center">
        {section.label}
      </div>
      <div className="col-span-4 bg-muted/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border">
        {section.heading}
      </div>
      {section.rows.map((row) => (
        <Fragment key={`${section.label}-${row.label}`}>
          <div className="px-3 py-2.5 text-xs font-medium text-muted-foreground border-r border-b border-border bg-muted flex items-center">
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
