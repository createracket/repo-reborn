import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Create Racket" },
      {
        name: "description",
        content:
          "Simple pricing for artists and brands. Start free, upgrade to Pro for priority briefs, advanced metrics and roster tools.",
      },
      { property: "og:title", content: "Pricing — Create Racket" },
      {
        property: "og:description",
        content:
          "Free forever for fans and browsing artists. Pro at $49/mo (or $490/yr) with a 7-day free trial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

type Interval = "monthly" | "yearly";

type Plan = {
  id: "free" | "pro" | "brand";
  name: string;
  tagline: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  priceLabel?: string; // for brand
  cta: string;
  ctaTo: string;
  highlight?: boolean;
  accent: string; // tailwind color hex
  features: string[];
  footnote?: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Discovery",
    tagline: "Get started for free!",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Get started free",
    ctaTo: "/login",
    accent: "#BADA55",
    features: [
      "Vibe Check tools",
      "Basic profile pages",
      "Gifting opportunities",
      "Help to grow our community",
    ],
  },
  {
    id: "pro",
    name: "Priority",
    tagline: "For artists & teams ready to connect.",
    priceMonthly: 49,
    priceYearly: 490,
    cta: "Secure your free strategy call",
    ctaTo: "/login",
    highlight: true,
    accent: "#FFC0CB",
    features: [
      "Everything in Discovery",
      "Unlimited collabs",
      "Priority matching on new briefs",
      "Public profile pages & roster features",
      "Advanced audience & content metrics",
      "Campaign reporting tools",
      "Direct support",
    ],
    footnote: "Limited-time offer. Monthly cancellation, no annual lock-ins.",
  },
  {
    id: "brand",
    name: "Pro",
    tagline: "For brands, labels & agency teams at scale.",
    priceMonthly: null,
    priceYearly: null,
    priceLabel: "Custom",
    cta: "Talk to us",
    ctaTo: "/connect",
    accent: "#5C37D0",
    features: [
      "Everything in Priority ",
      "Managed campaign services",
      "Unlimited seeding & gifting ",
      "Bespoke roster features",
      "Dedicated account partner",
      "Off-platform billing / retainer",
    ],
  },
];

function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium text-foreground/70">
              <Sparkles className="h-3.5 w-3.5 text-pink-accent" />
              Simple pricing. No lock-in.
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold text-white md:text-6xl">
              Scaled to amplify your story
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
              Start free. Upgrade when you're ready for priority briefs, deeper metrics, and the
              tools we use to run real campaigns.
            </p>

            {/* Interval toggle */}
            <div className="mt-8 inline-flex items-center rounded-full border border-border/60 bg-card/40 p-1">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  interval === "monthly"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  interval === "yearly"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                Yearly
                <span className="ml-1.5 rounded-full bg-[#BADA55] px-1.5 py-0.5 text-[10px] font-bold text-[#111]">
                  2 months free
                </span>
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} interval={interval} />
            ))}
          </div>

          {/* Promo code note */}
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border/60 bg-card/30 p-5 text-center text-sm text-foreground/80">
            Got an access code from a previous invite? Apply it at checkout or contact us for help.
          </div>

          {/* FAQ mini */}
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <Faq
              q="Can I switch plans later?"
              a="Yes - upgrade anytime from your billing settings. Changes prorate automatically."
            />
            <Faq
              q="Do you offer a free trial?"
              a="No but you can cancel your Priority Access if you're not vibing it - monthly cancellation periods apply but there's no surprise fees. "
            />
            <Faq
              q="Which payment methods work?"
              a="All major cards via Stripe. Enterprise and Brand plans can be billed off-platform - talk to our team to find something that fits."
            />
            <Faq
              q="What if I'm a fan, not an artist?"
              a="Racket is currently built for music and media partnerships but likeminded fans can subscriber for free to our newsletter and follow along on socials. "
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function PlanCard({ plan, interval }: { plan: Plan; interval: Interval }) {
  const price =
    plan.priceLabel != null
      ? plan.priceLabel
      : interval === "monthly"
        ? `$${plan.priceMonthly}`
        : `$${plan.priceYearly}`;
  const perLabel =
    plan.priceLabel != null
      ? ""
      : (plan.priceMonthly ?? 0) === 0
        ? "forever"
        : interval === "monthly"
          ? "/month"
          : "/year";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 md:p-7 ${
        plan.highlight
          ? "border-pink-accent/60 bg-card/60 shadow-[0_0_0_1px_rgba(255,192,203,0.35)]"
          : "border-border/60 bg-card/30"
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pink-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111]">
          EARLY MEMBER OFFER
        </span>
      )}

      <div
        className="mb-5 h-2 w-14 rounded-full"
        style={{ background: plan.accent }}
        aria-hidden
      />
      <h3 className="font-display text-2xl font-bold text-foreground">{plan.name}</h3>
      <p className="mt-1 text-sm text-foreground/70">{plan.tagline}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold text-foreground">{price}</span>
        {perLabel && <span className="text-sm text-foreground/60">{perLabel}</span>}
        {plan.priceLabel == null && (plan.priceMonthly ?? 0) > 0 && (
          <span className="ml-1 text-xs font-medium text-foreground/60">USD*</span>
        )}
      </div>
      {plan.id === "pro" && interval === "yearly" && (
        <div className="mt-1 text-xs text-foreground/60">Equivalent to ~$41 USD/month</div>
      )}

      <ul className="mt-6 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Button
          asChild
          className={`w-full ${plan.highlight ? "" : "bg-foreground/10 text-foreground hover:bg-foreground/20"}`}
          variant={plan.highlight ? "default" : "secondary"}
        >
          <Link to={plan.ctaTo}>{plan.cta}</Link>
        </Button>
        {plan.footnote && (
          <p className="mt-2 text-center text-xs text-foreground/60">{plan.footnote}</p>
        )}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h4 className="font-display text-base font-semibold text-foreground">{q}</h4>
      <p className="mt-2 text-sm leading-relaxed text-foreground/75">{a}</p>
    </div>
  );
}
