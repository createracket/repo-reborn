import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  FileText,
  Users,
  Sparkles,
  BarChart3,
  Heart,
  Shield,
  ScanLine,
  Mic2,
  ArrowRight,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/brands/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works for brands — Create Racket" },
      {
        name: "description",
        content:
          "Brief, match, seed and report. How Create Racket connects brands with culturally credible artists — without watering down either side.",
      },
      { property: "og:title", content: "How it works for brands — Create Racket" },
      {
        property: "og:description",
        content:
          "A curated tier of artists with audiences that actually trust them. No follower-count gambles.",
      },
    ],
  }),
  component: HowItWorksBrands,
});


const fadeUp: Variants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

function HowItWorksBrands() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="voicenotes-gradient pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl"
          >
            <motion.p
              variants={fadeUp}
              className="text-sm uppercase tracking-[0.25em] text-white/70"
            >
              For brands & agencies
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 font-headline text-4xl leading-tight tracking-tighter text-white md:text-6xl"
            >
              Find the{" "}
              <span className="text-pink-accent">artist</span> your brand
              has been looking for
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-snug text-white/90 md:text-xl"
            >
              A curated network of working musicians with audiences that
              actually trust them. Tell us the brief — we'll match, seed and
              report.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button asChild size="lg" className="h-12 rounded-full px-8">
                <Link to="/contact">Start a campaign</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/20 px-8 text-white hover:bg-white/10"
              >
                <Link to="/contact">Get in touch</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="-mt-12 rounded-t-[3rem] bg-[#2b2b2b]">
        {/* ── MISSION / WHY NOW ──────────────────────────────────── */}
        <section className="pt-20 pb-16">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80"
              >
                <Sparkles className="size-4 text-pink-accent" />
                Why Racket, why now
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Influencer marketing is{" "}
                <span className="text-pink-accent">tired</span>. Culture
                isn't.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg leading-relaxed text-white/80"
              >
                Brands have spent a decade buying reach from lifestyle
                creators and getting flat returns. Audiences can smell it.
                Working musicians — even at small scale — carry something
                Instagram talent doesn't: cultural credibility their fans
                already pay attention to.
              </motion.p>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-lg leading-relaxed text-white/80"
              >
                Racket is the curation layer. We don't sell follower counts.
                We match brands to artists whose values, audience and craft
                actually line up with the brief.
              </motion.p>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3"
            >
              <StatCard label="Converted to artists" value="$300k+" />
              <StatCard label="Equivalent streams" value="66.9M+" />
              <StatCard label="No follower minimums" value="Real reach" />
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── HOW IT WORKS — 4 STEPS ─────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80"
              >
                <ScanLine className="size-4 text-primary" />
                The process
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Brief, match, seed,{" "}
                <span className="text-pink-accent">report</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-white/80"
              >
                Four steps, no agency overhead, no follower spreadsheets.
                Start with one campaign — only commit to more when it
                works.
              </motion.p>
            </motion.div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StepCard
                step="01"
                icon={<FileText className="size-6" />}
                title="Brief"
                body="Tell us the product, the audience, the geography and the goal. No bloated RFPs — five questions and you're done."
                accent="border-pink-accent/40"
                iconBg="bg-pink-accent text-[#2b2b2b]"
              />
              <StepCard
                step="02"
                icon={<Users className="size-6" />}
                title="Match"
                body="We build a shortlist of artists whose Vibe Check, audience and values fit the brief. Curated by humans, surfaced by our matching system."
                accent="border-purple/40"
                iconBg="bg-purple text-white"
              />
              <StepCard
                step="03"
                icon={<Mic2 className="size-6" />}
                title="Seed"
                body="We handle outreach, briefing and fulfilment. Artists receive product or campaign assets in context — never cold, never generic."
                accent="border-primary/40"
                iconBg="bg-primary text-primary-foreground"
              />
              <StepCard
                step="04"
                icon={<BarChart3 className="size-6" />}
                title="Report"
                body="Post-campaign you get a clear read: content created, reach in context, sentiment, and (at higher tiers) affiliate attribution into your existing stack."
                accent="border-pink-accent/40"
                iconBg="bg-pink-accent text-[#2b2b2b]"
              />
            </div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              className="mx-auto mt-12 max-w-2xl text-center"
            >
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/20 px-8 text-white hover:bg-white/10"
              >
                <Link to="/contact">
                  Get in touch <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── VALUES ──────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80"
              >
                <Heart className="size-4 text-pink-accent" />
                What we stand for
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Working with Racket means working{" "}
                <span className="text-pink-accent">with</span> artists, not
                through them
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-white/80"
              >
                Our standards are the same whichever side of the platform
                you're on. They protect your campaign as much as they
                protect the artist.
              </motion.p>
            </motion.div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ValueCard
                icon={<Users className="size-6" />}
                title="Artist diversity, by design"
                body="Our roster intentionally amplifies neurodivergent, LGBTQIA+, First Nations and globally underrepresented artists. Authentic culture, not a marketing veneer."
              />
              <ValueCard
                icon={<Sparkles className="size-6" />}
                title="Fair compensation, always"
                body="No exposure-bucks. Every partnership we broker pays artists fairly and transparently — which is exactly why they show up for your brief."
              />
              <ValueCard
                icon={<Shield className="size-6" />}
                title="Cultural authenticity over scale"
                body="We turn down matches that don't fit. A campaign that lands with 4,000 right fans beats one that washes over 400,000 wrong ones — and your sell-through reflects it."
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* ── RECENT PARTNERSHIPS (placeholder vignettes) ────────── */}
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80"
              >
                <BarChart3 className="size-4 text-primary" />
                Recent partnerships
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Active campaigns, in the wild
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-white/80"
              >
                A snapshot of the kinds of partnerships Racket runs. Full
                case studies available on request.
              </motion.p>
            </motion.div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <OutcomeCard
                tag="Streetwear · Melbourne"
                title="Product launch seeded across 12 artists"
                body="A new drop placed with regionally relevant artists across hip-hop, R&B and electronic — over 40 organic posts in the first fortnight."
              />
              <OutcomeCard
                tag="Drinks · National"
                title="Festival activation matched to 6 acts"
                body="A summer campaign matched to touring artists whose tour routing overlapped the brand's festival footprint. Tracked redemptions via promo codes."
              />
              <OutcomeCard
                tag="Audio · Global"
                title="Ambassador programme for a launch market"
                body="A 6-month named ambassadorship with a single artist whose audience indexed strongly in a market the brand was entering. Co-created content, owned rights."
              />
            </div>

            <p className="mt-8 text-center text-xs text-white/50">
              Full case studies shared with qualified leads — get in touch.
            </p>
          </div>
        </section>

        <Divider />

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="text-center"
            >
              <motion.h2
                variants={fadeUp}
                className="font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Straight answers
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-lg text-white/80"
              >
                The questions brands ask before they sign off.
              </motion.p>
            </motion.div>

            <div className="mt-12">
              <Accordion type="single" collapsible className="w-full">
                <FaqItem
                  q="What if the artist doesn't post anything?"
                  a="Our seeding model is opt-in by design — artists only post when the product fits them, which is why posts that do happen feel native. Across our roster, organic post-through rates sit well above industry average. At Endorse and Partner tiers we include lightweight agreements with defined deliverables."
                />
                <FaqItem
                  q="How is this different from just finding influencers on Instagram?"
                  a="Two things. First, we curate working musicians — people whose audience already engages on the basis of their craft, not on their feed. Second, we handle the brief, the outreach, the fulfilment and the reporting, so you're not running a one-off DM campaign in-house."
                />
                <FaqItem
                  q="Do we need an affiliate programme already?"
                  a="No. At Seed tier we don't touch attribution. At Endorse and Partner tiers we can plug straight into impact.com, Awin, PartnerStack or ShareASale if you already run one — no new infrastructure required."
                />
                <FaqItem
                  q="How do you price?"
                  a="Seed campaigns start around $500. Endorse adds a small monthly retainer plus campaign costs. Partner is bespoke — typically used for named ambassadorships or ongoing programmes. Full breakdown on our pricing page."
                />
                <FaqItem
                  q="What does 'fit' actually mean?"
                  a="Every artist on Racket has completed our Vibe Check — a structured profile of values, audience, creative style and goals. We match on those signals, not on follower count. You can ask us to weight the brief however you want (audience location, genre, values, etc)."
                />
                <FaqItem
                  q="Can we get usage rights for the content?"
                  a="Yes. UGC rights are an optional add-on at Seed, included at Endorse, and fully negotiable at Partner (including paid social, owned channels and retail)."
                />
              </Accordion>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center md:p-14"
            >
              <h3 className="font-headline text-2xl tracking-tighter text-white md:text-3xl">
                Have a brief in mind?
              </h3>
              <p className="mt-4 text-white/70">
                Start with one campaign. Pay per campaign — only when it's
                right.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full px-8">
                  <Link to="/contact">Talk to us</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/20 px-8 text-white hover:bg-white/10"
                >
                  <Link to="/pricing/brands">See brand tiers</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}

/* ── small presentational helpers ─────────────────────────────── */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
    >
      <p className="font-headline text-3xl tracking-tighter text-pink-accent md:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-sm text-white/60">{label}</p>
    </motion.div>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
  accent,
  iconBg,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
  iconBg: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative rounded-2xl border ${accent} bg-card p-7`}
    >
      <span className="absolute right-5 top-5 font-headline text-3xl tracking-tighter text-white/10">
        {step}
      </span>
      <div
        className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="font-headline text-lg tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </motion.div>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-7"
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-pink-accent/15 text-pink-accent">
        {icon}
      </div>
      <h3 className="font-headline text-lg tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
    </motion.div>
  );
}

function OutcomeCard({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-pink-accent">
        {tag}
      </p>
      <h3 className="mt-3 font-headline text-lg tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <AccordionItem value={q} className="border-white/10">
      <AccordionTrigger className="text-left text-white hover:text-pink-accent">
        {q}
      </AccordionTrigger>
      <AccordionContent className="text-white/75 leading-relaxed">
        {a}
      </AccordionContent>
    </AccordionItem>
  );
}

function Divider() {
  return <div className="mx-auto h-px w-full max-w-6xl bg-white/10" />;
}
