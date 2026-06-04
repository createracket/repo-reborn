import { Fragment, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const discounts: Array<{
  title: string;
  months: string;
  body: string;
  eligibility: string;
}> = [
  {
    title: "Low income / working class",
    months: "1",
    body: "Self-declared low income or working class artists. Apply here in 2 mins — no proof of income required.",
    eligibility: "\n",
  },
  {
    title: "Underrepresented backgrounds",
    months: "2",
    body: "Artists from underrepresented or minority backgrounds — including First Nations, POC, LGBTQIA+, and artists with disability.",
    eligibility: "\n",
  },
  {
    title: "Partner referrals",
    months: "3",
    body: "Racket strives to level the playing field for artists who face multiple disadvantages — our partners can also refer artists for ongoing support.",
    eligibility: "",
  },
];

const faqs: Array<{ q: string; a: ReactNode }> = [
  {
    q: "What's included in the Free tier?",
    a: "A basic artist profile (name, genre, bio, links) and read-only access to the community. You won't be matched to brand briefings or eligible for seeded product campaigns, but you can explore everything Racket has to offer.",
  },
  {
    q: "How do brand deals actually work?",
    a: "Brands send briefs to Racket. We match them to artists on Starter, Pro and Ambassador tiers based on fit. Starter unlocks gifted campaigns; Pro adds priority matching plus paid affiliate placements; Ambassador is a managed retainer relationship where Racket pitches you directly.",
  },
  {
    q: "Can I switch tiers later?",
    a: "Yes — you can upgrade or downgrade at any time from your dashboard. Upgrades take effect immediately and we prorate the difference. Downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "How does annual billing work?",
    a: "Pay for 10 months upfront, get 12 months of access — a 17% saving vs paying monthly. You can cancel annual plans at any time but we don't refund partial years.",
  },
  {
    q: "Do I need to be a full-time artist?",
    a: "No. Racket is for any musician building a brand-ready career — emerging, part-time, side-project, established. What matters is that you take your audience and your creative output seriously.",
  },
  {
    q: "How does Ambassador work?",
    a: "Ambassador is application-only. We onboard a small cohort of artists each quarter who become long-term faces of partner brands. The retainer fee is bespoke, negotiated by Racket on your behalf, and we take a 15–20% agency fee.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard or email us at community@createracket.com. Monthly plans stop at the end of the current month; annual plans run until the end of the year you paid for.",
  },
  {
    q: "Do you offer team or label plans?",
    a: "Not yet — Racket is currently artist-first. If you're a label, management company or collective interested in onboarding multiple artists, email community@createracket.com and we'll be in touch.",
  },
];


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

type Tier = "starter" | "pro" | "ambassador";

const tierTint: Record<Tier, string> = {
  starter: "bg-primary/15 text-foreground",
  pro: "bg-purple/25 text-foreground",
  ambassador: "bg-pink-accent/25 text-foreground",
};

const tierAccent: Record<Tier, string> = {
  starter: "border-l-4 border-l-primary",
  pro: "border-l-4 border-l-purple",
  ambassador: "border-l-4 border-l-pink-accent",
};

type Row = {
  label: string;
  values: Record<"free" | Tier, { tick?: boolean; dash?: boolean; text?: string }>;
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

const paidTiers: Tier[] = ["starter", "pro", "ambassador"];

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
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">FOR ARTISTS</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            PICK YOUR <span className="text-gradient-racket">TIER</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Find the right level of Racket for where you're at as an artist — from growing your community to proactive support for your long-term ambitions.
          </p>
        </div>

        {/* Free tier hero */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-headline text-lg tracking-wide text-muted-foreground">FREE</div>
              <div className="mt-1 font-display text-5xl tracking-tight">$0</div>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">
                Community access includes a basic artist profile (name, genre, bio, links), expert resources, and invites to artist events.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80">
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> Basic profile</div>
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> Community access</div>
              <div className="flex items-center gap-2"><span className="text-primary font-semibold">✓</span> Free resources</div>
            </div>
          </div>
        </div>

        {/* Paid tiers grid */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/30">
          <div
            className="min-w-[720px] grid"
            style={{ gridTemplateColumns: "170px repeat(3, 1fr)" }}
          >
            {/* Header row */}
            <div className="border-r border-b border-border bg-card" />
            {paidTiers.map((t) => {
              const meta: Record<Tier, { name: string; price: React.ReactNode }> = {
                starter: {
                  name: "Starter",
                  price: (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display tracking-tight">$20</span>
                        <span className="text-sm text-muted-foreground">/ mo</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        or <span className="text-foreground font-medium">$200/yr</span>
                        <span className="ml-1 text-primary">· save 17%</span>
                      </div>
                    </>
                  ),
                },
                pro: {
                  name: "Pro",
                  price: (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display tracking-tight">$50</span>
                        <span className="text-sm text-muted-foreground">/ mo</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        or <span className="text-foreground font-medium">$500/yr</span>
                        <span className="ml-1 text-primary">· save 17%</span>
                      </div>
                    </>
                  ),
                },
                ambassador: {
                  name: "Ambassador",
                  price: (
                    <>
                      <div className="text-3xl font-display tracking-tight">Bespoke</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Application only · retainer
                      </div>
                    </>
                  ),
                },
              };
              const isLast = t === "ambassador";
              return (
                <div
                  key={t}
                  className={cn(
                    "p-5 border-b border-border",
                    !isLast && "border-r",
                    tierTint[t],
                    tierAccent[t]
                  )}
                >
                  <div className="font-headline text-lg tracking-wide">{meta[t].name.toUpperCase()}</div>
                  <div className="mt-3">{meta[t].price}</div>
                </div>
              );
            })}

            {sections.map((section) => (
              <SectionBlock key={section.label} section={section} />
            ))}

          </div>
        </div>

        {/* Cross-link to brands pricing */}
        <div className="mt-12 rounded-2xl border border-border bg-card/60 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-headline text-sm tracking-wide text-pink-accent">FOR BRANDS</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Looking to work with Racket artists? See our brand-facing tiers.
            </p>
          </div>
          <Link
            to="/pricing/brands"
            className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
          >
            View brand pricing →
          </Link>
        </div>




        {/* Special discounts */}
        <section className="mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-pink-accent">
              ARTIST SUPPORT
            </p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
              FOR ARTISTS WHO NEED IT
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              We offer 1–3 months of free paid tier access to artists who may be
              disadvantaged. Removing the barrier to entry helps Racket to foster
              genuine diversity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {discounts.map((d) => (
              <div
                key={d.title}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col"
              >
                <div className="font-headline text-sm tracking-wide text-pink-accent">
                  {d.title.toUpperCase()}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl">{d.months}</span>
                  <span className="text-sm text-muted-foreground">
                    month{d.months === "1" ? "" : "s"} free
                  </span>
                </div>
                <p className="mt-4 text-sm text-foreground/85 leading-relaxed flex-1">
                  {d.body}
                </p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-pink-accent" />
                  {d.eligibility}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Email{" "}
            <a
              href="mailto:community@createracket.com"
              className="text-primary hover:underline"
            >
              community@createracket.com
            </a>{" "}
            to verify eligibility.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 scroll-mt-24">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">
              FAQ
            </p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Everything you need to know about membership, billing and access.
              Still stuck? Email{" "}
              <a
                href="mailto:community@createracket.com"
                className="text-primary hover:underline"
              >
                community@createracket.com
              </a>
              .
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card divide-y divide-border"
          >
            {faqs.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`faq-${i}`}
                className="border-b-0 px-5"
              >
                <AccordionTrigger className="font-headline text-base tracking-wide text-left hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/85 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

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
      <div className="col-span-3 bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary border-b border-border">
        {section.heading}
      </div>
      {section.rows.map((row) => (
        <Fragment key={`${section.label}-${row.label}`}>
          <div className="px-3 py-2.5 text-xs font-medium text-foreground/80 border-r border-b border-border bg-card flex items-center">
            {row.label}
          </div>
          {paidTiers.map((t) => (
            <Cell key={`${section.label}-${row.label}-${t}`} tier={t} value={row.values[t]} />
          ))}
        </Fragment>
      ))}
    </>
  );
}


