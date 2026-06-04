import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing/brands")({
  head: () => ({
    meta: [
      { title: "Pricing for brands — Create Racket" },
      {
        name: "description",
        content:
          "How brands work with Racket — Discovery, Seed, Endorse and Partner tiers for working with culturally credible artists.",
      },
      { property: "og:title", content: "Pricing for brands — Create Racket" },
      {
        property: "og:description",
        content:
          "Brand tiers for working with Racket artists — from free discovery through full-service ambassador programmes.",
      },
    ],
  }),
  component: BrandsPricingPage,
});

type BrandTier = "discovery" | "seed" | "endorse" | "partner";

const brandTierMeta: Record<
  BrandTier,
  { name: string; price: string; tint: string; accent: string }
> = {
  discovery: {
    name: "Discovery",
    price: "Free",
    tint: "bg-muted/40 text-foreground",
    accent: "border-l-4 border-l-muted-foreground/40",
  },
  seed: {
    name: "Seed",
    price: "From ~$500 / campaign",
    tint: "bg-primary/15 text-foreground",
    accent: "border-l-4 border-l-primary",
  },
  endorse: {
    name: "Endorse",
    price: "From ~$150/mo + campaign costs",
    tint: "bg-purple/25 text-foreground",
    accent: "border-l-4 border-l-purple",
  },
  partner: {
    name: "Partner",
    price: "Bespoke — from ~$500/mo",
    tint: "bg-pink-accent/25 text-foreground",
    accent: "border-l-4 border-l-pink-accent",
  },
};

const brandTiers: BrandTier[] = ["seed", "endorse", "partner"];

type BrandCell = { tick?: boolean; dash?: boolean; text?: string; note?: string };
type BrandRow = { label: string; values: Record<BrandTier, BrandCell> };
type BrandSection = { label: string; heading: string; rows: BrandRow[] };

const narratives = {
  new: {
    title: "Racket is your creative partner, not a platform to figure out.",
    body: "You bring a brief and a product — we match you with working artists whose audiences already trust them. No follower-count gambles, no generic lifestyle content. Every campaign is curated, contextual, and low-risk to start.",
    tags: {
      discovery: "Best starting point",
      seed: "No subscription needed",
      endorse: "Growing brands",
      partner: "Full programme",
    } as Record<BrandTier, string>,
    seedNote: "Racket handles everything — fulfilment, brief, outreach",
    accessFree: "No commitment needed to explore",
    bottomTitle: "Why artists beat traditional lifestyle influencers",
    bottomBody:
      "Artists have more engaged, trust-based communities that hinge on authentic content — not follower counts. An emerging musician with 4,000 Instagram followers plays 80 shows a year, reaching real people in real moments. Racket measures impact differently, giving brands access to the relevant metrics that other platforms miss. ",
  },
  existing: {
    title:
      "Racket slots into your existing affiliate and influencer infrastructure — and upgrades it.",
    body: "Your programme already tracks links and manages commissions. Racket adds a curated tier of culturally credible artists who perform better on authenticity than standard influencer pools, with full integration into platforms like impact.com and Awin.",
    tags: {
      discovery: "Low-risk pilot",
      seed: "Test before committing",
      endorse: "Extend your programme",
      partner: "Replace agency spend",
    } as Record<BrandTier, string>,
    seedNote: "Ideal first test alongside existing influencer programme",
    accessFree: "See how Racket artists compare to your current roster",
    bottomTitle: "How Racket fits your existing affiliate programme",
    bottomBody:
      "At Endorse and Partner level, Racket integrates directly with your existing affiliate platform — impact.com, Awin, PartnerStack, ShareASale. Artists receive tracked links and promo codes that flow through your existing attribution stack. There's no new infrastructure to build. Racket just adds a better quality, more authentic tier of partners to what you already run.",
  },
} as const;

function buildBrandSections(mode: "new" | "existing"): BrandSection[] {
  const n = narratives[mode];
  return [
    {
      label: "Access",
      heading: "What the brand can see and do",
      rows: [
        {
          label: "Artist roster",
          values: {
            discovery: { tick: true, text: "Browse curated artist profiles", note: n.accessFree },
            seed: { tick: true, text: "Full roster + filter by genre, location, discipline" },
            endorse: { tick: true, text: "Full roster + priority matching by Racket" },
            partner: { tick: true, text: "Dedicated account management — Racket builds your shortlist" },
          },
        },
        {
          label: "Campaign dashboard",
          values: {
            discovery: { dash: true },
            seed: { tick: true, text: "Per-campaign reporting" },
            endorse: { tick: true, text: "Live dashboard + performance tracking" },
            partner: { tick: true, text: "Full dashboard + custom reporting + affiliate attribution" },
          },
        },
        {
          label: "Affiliate integration",
          values: {
            discovery: { dash: true },
            seed: { dash: true },
            endorse: { tick: true, text: "Promo codes + tracked links set up by Racket" },
            partner: { tick: true, text: "Full integration with impact.com, Awin etc" },
          },
        },
      ],
    },
    {
      label: "Campaigns",
      heading: "What campaigns are available at each tier",
      rows: [
        {
          label: "Seeded gifting",
          values: {
            discovery: { dash: true, text: "Not active at free tier" },
            seed: { tick: true, text: "5–15 curated artists, product only, no obligation", note: n.seedNote },
            endorse: { tick: true, text: "Up to 30 artists per campaign" },
            partner: { tick: true, text: "Unlimited — ongoing seeding programme" },
          },
        },
        {
          label: "Endorsed placement",
          values: {
            discovery: { dash: true },
            seed: { dash: true },
            endorse: { tick: true, text: "Lightweight agreements, organic content, tracked performance" },
            partner: { tick: true, text: "Multi-artist campaigns, full brief management" },
          },
        },
        {
          label: "Named ambassadorship",
          values: {
            discovery: { dash: true },
            seed: { dash: true },
            endorse: { dash: true },
            partner: { tick: true, text: "Single artist, defined term, retainer, co-creation options" },
          },
        },
        {
          label: "UGC content rights",
          values: {
            discovery: { dash: true },
            seed: { tick: true, text: "Optional add-on — license organic content created" },
            endorse: { tick: true, text: "Included — usage rights negotiated by Racket" },
            partner: { tick: true, text: "Full rights package — paid ads, owned channels, retail" },
          },
        },
      ],
    },
    {
      label: "Support",
      heading: "How much Racket does for the brand",
      rows: [
        {
          label: "Brief writing",
          values: {
            discovery: { dash: true },
            seed: { tick: true, text: "Racket writes the brief from your product + goals" },
            endorse: { tick: true, text: "Brief + artist shortlist + outreach handled" },
            partner: { tick: true, text: "Full campaign strategy, brief, outreach + execution" },
          },
        },
        {
          label: "Artist outreach",
          values: {
            discovery: { dash: true },
            seed: { tick: true, text: "Racket contacts and coordinates all artists" },
            endorse: { tick: true, text: "Ongoing relationship management" },
            partner: { tick: true, text: "Dedicated relationship manager" },
          },
        },
        {
          label: "Campaign reporting",
          values: {
            discovery: { dash: true },
            seed: { tick: true, text: "Post-campaign summary report" },
            endorse: { tick: true, text: "Performance report + content audit" },
            partner: { tick: true, text: "Full attribution report — ties to affiliate + sales data" },
          },
        },
      ],
    },
  ];
}

function BrandCellView({ tier, value }: { tier: BrandTier; value: BrandCell }) {
  return (
    <div
      className={cn(
        "p-3 text-xs leading-relaxed border-r border-b border-border last:border-r-0",
        brandTierMeta[tier].tint,
      )}
    >
      {value.tick && <span className="mr-1 text-primary font-semibold">✓</span>}
      {value.dash && <span className="mr-1 text-muted-foreground">–</span>}
      {value.text}
      {value.note && (
        <div className="mt-1 text-[11px] opacity-75 leading-snug">{value.note}</div>
      )}
    </div>
  );
}

function BrandSectionBlock({ section }: { section: BrandSection }) {
  return (
    <>
      <div className="bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-pink-accent border-r border-b border-border flex items-center">
        {section.label}
      </div>
      <div className="col-span-3 bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-pink-accent border-b border-border">
        {section.heading}
      </div>
      {section.rows.map((row) => (
        <Fragment key={`brand-${section.label}-${row.label}`}>
          <div className="px-3 py-2.5 text-xs font-medium text-foreground/80 border-r border-b border-border bg-card flex items-center">
            {row.label}
          </div>
          {brandTiers.map((t) => (
            <BrandCellView
              key={`brand-${section.label}-${row.label}-${t}`}
              tier={t}
              value={row.values[t]}
            />
          ))}
        </Fragment>
      ))}
    </>
  );
}

function BrandsPricingPage() {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const n = narratives[mode];
  const sections = buildBrandSections(mode);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-center gap-3 text-xs">
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
            ← For artists
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-pink-accent font-medium">For brands</span>
        </div>

        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-pink-accent">
            For brands
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            BRAND <span className="text-gradient-racket">TIERS</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            How brands work with Racket — from free discovery through to full
            service solutions for ambassador partnerships and community management.
          </p>
        </div>

        {/* Audience toggle */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1 mb-5">
          {(
            [
              { key: "new", label: "New to creator partnerships" },
              { key: "existing", label: "Already runs influencer / affiliate" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={cn(
                "px-4 py-2 text-xs font-medium rounded-lg transition-colors",
                mode === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Narrative bar */}
        <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground mb-6 leading-relaxed">
          <span className="text-foreground font-medium">{n.title}</span> {n.body}
        </div>

        {/* Discovery (free) hero */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-headline text-lg tracking-wide text-muted-foreground">DISCOVERY</div>
              <div className="mt-1 font-display text-5xl tracking-tight">Free</div>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">
                {n.accessFree}. Browse curated artist profiles and get a feel for how Racket works before you commit to a campaign.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> Browse curated artists</div>
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> No commitment</div>
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> Upgrade when you're ready</div>
            </div>
          </div>
        </div>

        {/* Brand grid */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/30">
          <div
            className="min-w-[720px] grid"
            style={{ gridTemplateColumns: "170px repeat(3, 1fr)" }}
          >
            <div className="border-r border-b border-border bg-card" />
            {brandTiers.map((t, i) => {
              const meta = brandTierMeta[t];
              const isLast = i === brandTiers.length - 1;
              return (
                <div
                  key={t}
                  className={cn(
                    "p-5 border-b border-border",
                    !isLast && "border-r",
                    meta.tint,
                    meta.accent,
                  )}
                >
                  <div className="font-headline text-lg tracking-wide">
                    {meta.name.toUpperCase()}
                  </div>
                  <div className="mt-2 text-xs opacity-75">{meta.price}</div>
                  <div className="mt-3 inline-block rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium">
                    {n.tags[t]}
                  </div>
                </div>
              );
            })}

            {sections.map((section) => (
              <BrandSectionBlock key={section.label} section={section} />
            ))}
          </div>
        </div>

        {/* Bottom context bar */}
        <div className="mt-4 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          <div className="text-foreground font-medium mb-1">{n.bottomTitle}</div>
          {n.bottomBody}
        </div>

        <div className="mt-12 text-sm text-muted-foreground">
          Looking for artist membership tiers?{" "}
          <Link to="/pricing" className="text-primary hover:underline">
            See pricing for artists →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
