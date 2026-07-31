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
  tag: string;
  tagline: string;
  desc: string;
  titleBg: string;
};

const TIERS: Tier[] = [
  {
    label: "Discovery",
    tag: "FREE",
    tagline: "Free to vibe check and submit your first brief",
    desc: "Take our vibe check to start finding future collaborators and submit your first brief for free. No cost, no commitment.",
    titleBg: "linear-gradient(90deg, #8b5cf6 0%, #c084fc 45%, #f4b8c4 100%)",
  },
  {
    label: "Seed",
    tag: "LOW-RISK, EASY ENTRY",
    tagline: "Putting your product in the right hands",
    desc: "Gift awesome products and seed new campaign assets with relevant creators - reaching musicians, fans, and cultural tastemakers.",
    titleBg: "linear-gradient(90deg, #5C37D0 0%, #6d43e8 100%)",
  },
  {
    label: "Endorse",
    tag: "CAMPAIGN PLAN",
    tagline: "Get priority for highly targeted campaigns",
    desc: "Build a bespoke roster for a campaign or ambassador program - leveraging lightweight agreements with set deliverables.",
    titleBg: "linear-gradient(90deg, #a8cc3d 0%, #bada55 100%)",
  },
  {
    label: "Partner",
    tag: "BESPOKE",
    tagline: "Retained programmes for sustainable results",
    desc: "Custom collabs with tailored campaign tools and full account management - priority matching and paid media support.",
    titleBg: "linear-gradient(90deg, #e8a8ac 0%, #f2c4c4 100%)",
  },
];


function PartnerPage() {
  return (
    <>
      <SiteHeader minimal />
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-6xl px-3 py-8 sm:px-6 md:py-12">
          <h1 className="text-center font-display text-3xl font-bold text-white md:text-5xl">
            How to Create Racket
          </h1>

          <div className="mt-6 rounded-3xl border border-[#e8c8b8]/60 px-5 py-4 md:px-8 md:py-5">
            <p className="text-center text-sm leading-relaxed text-foreground md:text-lg">
              Racket is your creative partner, not another platform to figure out. You bring a brief
              and a product - we match you with artists whose audiences already trust them. Enough to
              buy from them. No generic content, no compromising your messaging. Every campaign is
              curated, contextual, and low-risk to get started.
            </p>
          </div>

          <h2 className="mt-6 text-center font-display text-base font-bold text-[#b7d34a] md:text-lg">
            Choose your tier:
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {TIERS.map((t) => (
              <div key={t.label} className="flex flex-col gap-3">
                <div
                  className="rounded-2xl px-3 py-2.5 text-center md:py-3"
                  style={{ background: t.titleBg }}
                >
                  <span className="font-display text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-3xl">
                    {t.label}
                  </span>
                </div>
                <div className="flex min-h-[72px] items-center justify-center rounded-2xl bg-card/50 px-4 py-4 md:min-h-[92px]">
                  <p className="text-center text-sm font-medium leading-snug text-foreground md:text-base">
                    {t.tagline}
                  </p>
                </div>

                <div className="flex flex-1 flex-col rounded-2xl bg-card/50 p-4 md:p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl font-bold text-white md:text-2xl">
                      {t.label}
                    </h3>
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-foreground/60 md:text-[10px]">
                      {t.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80 md:text-base">
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>


          <Link
            to="/login"
            className="mt-6 block rounded-2xl py-4 text-center font-display text-lg font-bold underline underline-offset-4 transition hover:opacity-90 md:text-xl"
            style={{
              background: "linear-gradient(90deg, #e8b5a2 0%, #f4d8cc 55%, #fdf6f0 100%)",
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

