import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner with Create Racket — Our services & tiers" },
      {
        name: "description",
        content:
          "Create Racket is your creative partner. Explore our four tiers — Discovery, Seed, Endorse and Partner — and pick the right way to work with us.",
      },
      { property: "og:title", content: "Partner with Create Racket" },
      {
        property: "og:description",
        content: "Curated, contextual campaigns matching brands with artists whose audiences already trust them.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PartnerPage,
});

type Tier = {
  label: string;
  tagline: string;
  gradient: string;
  tag?: string;
  desc?: string;
};

const TIERS: Tier[] = [
  {
    label: "Discovery",
    tagline: "Free to vibe check and submit your first brief",
    gradient: "linear-gradient(135deg, #f3b7a0 0%, #d9c78a 55%, #a8c76f 100%)",
    tag: "FREE",
    desc: "Take our vibe check to start finding future collaborators and submit your first brief for free. No cost, no commitment.",
  },
  {
    label: "Seed",
    tagline: "Putting your product in the right hands",
    gradient: "#BADA55",
    tag: "LOW-RISK, EASY ENTRY",
    desc: "Gift awesome products and seed new campaign assets with relevant creators - reaching musicians, fans, and cultural tastemakers.",
  },
  {
    label: "Endorse",
    tagline: "Get priority for highly targeted campaigns",
    gradient: "#FFC0CB",
    tag: "CAMPAIGN PLAN",
    desc: "Build a bespoke roster for a campaign or ambassador program - leveraging lightweight agreements with set deliverables.",
  },
  {
    label: "Partner",
    tagline: "Retained programmes for sustainable results",
    gradient: "#5C37D0",
    tag: "Bespoke",
    desc: "Custom collabs with tailored campaign tools and full account management - priority matching and paid media support.",
  },
];

function PartnerPage() {
  return (
    <>
      <SiteHeader minimal />
      <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-3 py-10 sm:px-6 md:py-16">
        <h1 className="text-center font-display text-3xl font-bold text-primary md:text-5xl">
          How Brands Create Racket
        </h1>

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10">
          <p className="text-center text-base leading-relaxed text-foreground md:text-xl">
            Racket is your creative partner, not another platform to figure out. You bring a brief and a product - we
            match you with artists whose audiences already trust them. Enough to buy from them. No generic content, no
            compromising your messaging. Every campaign is curated, contextual, and low-risk to get started.
          </p>
        </div>

        <h2 className="mt-14 text-center font-display text-2xl font-bold text-[#b7d34a] md:text-3xl">
          Choose your tier:
        </h2>

        <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-5">
          {TIERS.map((t) => {
            return (
            <div key={t.label} className="flex flex-col gap-3">
              <div
                className="flex h-24 items-center justify-center rounded-xl px-2 shadow-lg sm:h-36 md:h-44"
                style={{ background: t.gradient }}
              >
                <span
                  className="font-display text-sm font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:text-2xl md:text-4xl lg:text-5xl"
                >
                  {t.label}
                </span>
              </div>
              <div className="min-h-[90px] rounded-xl border border-border/60 bg-card/30 p-4 text-center">
                <p className="text-base leading-snug text-foreground/90">{t.tagline}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/30 p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold text-foreground">{t.label}</span>
                  {t.tag && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                      {t.tag}
                    </span>
                  )}
                </div>
                {t.desc && <p className="mt-3 text-base leading-relaxed text-foreground/80">{t.desc}</p>}
              </div>
            </div>
            );
          })}
        </div>

        <Link
          to="/login"
          className="mt-12 block rounded-full py-5 text-center font-display text-xl font-semibold text-foreground underline underline-offset-4 shadow-md transition hover:opacity-90 md:text-2xl"
          style={{
            background: "linear-gradient(90deg, #e8a998 0%, #f0c8b8 50%, #f8ecd8 100%)",
            color: "#111",
          }}
        >
          Get Started
        </Link>
      </section>
    </main>
    <SiteFooter />
  </>
  );
}
