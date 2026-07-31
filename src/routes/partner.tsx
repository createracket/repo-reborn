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
  border: string;
  desc: string;
};

const TIERS: Tier[] = [
  {
    label: "Discovery",
    tagline: "Free to vibe check and submit your first brief",
    gradient: "linear-gradient(90deg, #b58ae0 0%, #7b5bd6 100%)",
    border: "#8a6ad8",
    desc: "Take our vibe check to start finding future collaborators and submit your first brief for free. No cost, no commitment.",
  },
  {
    label: "Seed",
    tagline: "Putting your product in the right hands",
    gradient: "#5C37D0",
    border: "#5C37D0",
    desc: "Gift awesome products and seed new campaign assets with relevant creators - reaching musicians, fans, and cultural tastemakers.",
  },
  {
    label: "Endorse",
    tagline: "Get priority for highly targeted campaigns",
    gradient: "#a8cc4a",
    border: "#a8cc4a",
    desc: "Build a bespoke roster for a campaign or ambassador program - leveraging lightweight agreements with set deliverables.",
  },
  {
    label: "Partner",
    tagline: "Retained programmes for sustainable results",
    gradient: "#f0b8b8",
    border: "#e8c8c0",
    desc: "Custom collabs with tailored campaign tools and full account management - priority matching and paid media support.",
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

          <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
            {TIERS.map((t) => (
              <div key={t.label} className="flex flex-col gap-3">
                <div
                  className="flex h-14 items-center justify-center rounded-xl px-2 sm:h-16 md:h-20"
                  style={{ background: t.gradient }}
                >
                  <span className="font-display text-sm font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:text-xl md:text-3xl">
                    {t.label}
                  </span>
                </div>
                <p className="px-1 text-center text-xs leading-snug text-foreground/90 sm:text-sm md:text-base">
                  {t.tagline}
                </p>
                <div
                  className="flex-1 rounded-xl border p-3 text-center md:p-4"
                  style={{ borderColor: t.border }}
                >
                  <p className="text-xs leading-snug text-foreground/85 sm:text-sm md:text-base">
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

