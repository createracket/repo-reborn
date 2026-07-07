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
    gradient: "linear-gradient(135deg, #4b2fb3 0%, #3a1f8f 55%, #6a4ee0 100%)",
    tag: "LOW-RISK, EASY ENTRY",
    desc: "Gift awesome products and seed new campaign assets with relevant creators - reaching musicians, fans, and cultural tastemakers.",
  },
  {
    label: "Endorse",
    tagline: "Get priority for highly targeted campaigns",
    gradient: "linear-gradient(135deg, #8faa2e 0%, #6f8a1f 55%, #3f4d10 100%)",
    tag: "CAMPAIGN PLAN",
    desc: "Build a bespoke roster for a campaign or ambassador program - leveraging lightweight agreements with set deliverables.",
  },
  {
    label: "Partner",
    tagline: "Retained programmes for sustainable results",
    gradient: "linear-gradient(135deg, #a48b8a 0%, #6a4f4d 55%, #d7bcbb 100%)",
    tag: "Bespoke",
    desc: "Custom collabs with tailored campaign tools and full account management - priority matching and paid media support.",
  },
];

function PartnerPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <h1 className="text-center font-display text-2xl font-bold text-primary md:text-3xl">
          How Brands Create Racket
        </h1>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <p className="text-center text-sm leading-relaxed text-foreground md:text-base">
            Racket is your creative partner, not another platform to figure out. You bring a brief and a product - we
            match you with artists whose audiences already trust them. Enough to buy from them. No generic content, no
            compromising your messaging. Every campaign is curated, contextual, and low-risk to get started.
          </p>
        </div>

        <h2 className="mt-14 text-center font-display text-xl font-bold text-[#b7d34a] md:text-2xl">
          Choose your tier:
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t.label} className="flex flex-col gap-3">
              <div
                className="flex h-32 items-center justify-center rounded-xl px-4 shadow-lg md:h-36"
                style={{ background: t.gradient }}
              >
                <span className="font-display text-3xl font-bold text-white drop-shadow-md md:text-4xl">{t.label}</span>
              </div>
              <div className="min-h-[80px] rounded-xl border border-border/60 bg-card/30 p-4 text-center">
                <p className="text-sm leading-snug text-foreground/90">{t.tagline}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/30 p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-bold text-foreground">{t.label}</span>
                  {t.tag && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                      {t.tag}
                    </span>
                  )}
                </div>
                {t.desc && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{t.desc}</p>}
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/login"
          className="mt-10 block rounded-full py-4 text-center font-display text-lg font-semibold text-foreground underline underline-offset-4 shadow-md transition hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #e8a998 0%, #f0c8b8 50%, #f8ecd8 100%)",
            color: "#111",
          }}
        >
          Get Started
        </Link>
      </section>
    </main>
  );
}
