import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Handshake, Link2, Sparkles, Globe, Heart, Target, Mic2 } from "lucide-react";
import type { Variants } from "framer-motion";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Create Racket" },
      {
        name: "description",
        content:
          "Learn how Create Racket connects artists with the right collaborators through fan-built tech, authentic matching, and fair compensation.",
      },
      { property: "og:title", content: "How it works — Create Racket" },
      {
        property: "og:description",
        content:
          "The seeding and endorsement model that puts artists first.",
      },
    ],
  }),
  component: HowItWorks,
});

const fadeUp: Variants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

function HowItWorks() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
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
              For artists, by artists
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 font-headline text-4xl leading-tight tracking-tighter text-white md:text-6xl"
            >
              Where <span className="text-pink-accent">creative</span>{" "}
              <span className="text-pink-accent">partners</span> connect
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-snug text-white/90 md:text-xl"
            >
              We operate at the cultural edge of media and music, using fan-built
              tech to authentically pair artists with the right collaborators.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Curve into dark section */}
      <div className="-mt-12 rounded-t-[3rem] bg-[#2b2b2b]">
        {/* ── MISSION ──────────────────────────────────────────────── */}
        <section className="pt-20 pb-16">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80">
                <Sparkles className="size-4 text-pink-accent" />
                Our mission
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Unlocking brand new revenue streams for{" "}
                <span className="text-pink-accent">musicians</span> at every stage
                of their careers
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg leading-relaxed text-white/80"
              >
                The music industry has never had a shortage of talent — but finding
                the right partners, brands, and collaborators has always been a
                guessing game. Create Racket exists to change that. We believe
                every artist deserves access to meaningful, well-matched
                opportunities that respect their craft and their audience.
              </motion.p>
              <motion.p
                variants={fadeUp}
                className="mt-4 text-lg leading-relaxed text-white/80"
              >
                By combining fan-built technology with deep cultural understanding,
                we cut through the noise and surface partnerships that actually
                make sense — not just on paper, but in practice. Whether you are
                an emerging producer or a touring act with a decade behind you,
                we are here to expand what is possible.
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
              <StatCard
                label="Equivalent Spotify streams"
                value="66.9M+"
              />
              <StatCard label="Global community" value="Worldwide" />
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
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
                <Target className="size-4 text-primary" />
                The model
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-headline text-3xl tracking-tighter text-white md:text-5xl"
              >
                Seeding & endorsement,{" "}
                <span className="text-pink-accent">reimagined</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-white/80"
              >
                Traditional talent sourcing is slow, opaque, and rarely gets the
                culture right. We flip the script: artists lead with their story,
                and our platform surfaces the partners who genuinely fit.
              </motion.p>
            </motion.div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              <StepCard
                step="01"
                icon={<Mic2 className="size-6" />}
                title="Take the Vibe Check"
                body="Answer a few questions about your goals, creative style, audience, and values. Our system learns what makes you tick — not just what box you tick."
                accent="border-pink-accent/40"
                iconBg="bg-pink-accent text-[#2b2b2b]"
              />
              <StepCard
                step="02"
                icon={<Users className="size-6" />}
                title="Get your archetype"
                body="We match you to one of seven artist archetypes — from the Loyalist who lives for community, to the Maker who builds worlds in the studio. This is not a label; it is a lens."
                accent="border-purple/40"
                iconBg="bg-purple text-white"
              />
              <StepCard
                step="03"
                icon={<Handshake className="size-6" />}
                title="Connect & create"
                body="Build your roster of verified collaborators, or let our team hand-pick brand partnerships and campaign opportunities that align with who you actually are."
                accent="border-primary/40"
                iconBg="bg-primary text-primary-foreground"
              />
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center md:p-12"
            >
              <motion.h3
                variants={fadeUp}
                className="font-headline text-2xl tracking-tighter text-white md:text-3xl"
              >
                Three ways to work with Racket
              </motion.h3>
              <motion.div
                variants={fadeUp}
                className="mt-8 grid grid-cols-1 gap-6 text-left sm:grid-cols-3"
              >
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 font-headline text-lg text-pink-accent">
                    <Users className="size-4" />
                    Co-create
                  </h4>
                  <p className="text-sm leading-relaxed text-white/70">
                    Build your own roster — a verified network of like-minded
                    partners to co-create with.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 font-headline text-lg text-purple">
                    <Handshake className="size-4" />
                    Collaborate
                  </h4>
                  <p className="text-sm leading-relaxed text-white/70">
                    Work directly with our team to put fans at the heart of your
                    creative content.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 font-headline text-lg text-primary">
                    <Link2 className="size-4" />
                    Connect
                  </h4>
                  <p className="text-sm leading-relaxed text-white/70">
                    Fuel your next campaign or media activation with the right
                    creative partners.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── VALUES ───────────────────────────────────────────────── */}
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
                Built for <span className="text-pink-accent">artists</span>,{" "}
                not algorithms
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-white/80"
              >
                Our platform is designed around the things that actually matter
                to creative people: fairness, authenticity, and the freedom to
                be yourself.
              </motion.p>
            </motion.div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ValueCard
                icon={<Globe className="size-6" />}
                title="Artist diversity"
                body="We actively champion underrepresented voices — neurodivergent artists, LGBTQIA+ creators, First Nations musicians, and communities that mainstream platforms overlook. Representation is not a checkbox for us; it is the foundation."
              />
              <ValueCard
                icon={<Sparkles className="size-6" />}
                title="Fair compensation"
                body="We have already converted over $300k directly to artists — the equivalent of tens of millions of streams. Every deal we broker is built on transparency and terms that respect the artist's time, image, and audience."
              />
              <ValueCard
                icon={<Heart className="size-6" />}
                title="Cultural authenticity"
                body="We do not do forced fits. Our Vibe Check and archetype system means partnerships are grounded in shared values, real creative overlap, and mutual respect — so the work feels genuine to fans and creators alike."
              />
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mx-auto mt-16 max-w-3xl text-center"
            >
              <motion.p
                variants={fadeUp}
                className="text-lg italic leading-relaxed text-white/80"
              >
                "Racket fosters creativity and drives audience growth for artists
                across the globe, connecting likeminded collaborators and
                empowering authentic partnerships that resonate with real fans."
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
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
                Ready to find your people?
              </h3>
              <p className="mt-4 text-white/70">
                Take the Vibe Check, discover your archetype, and start building
                partnerships that actually fit.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full px-8">
                  <Link to="/vibe-check/musician">
                    Take the Vibe Check
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/20 px-8 text-white hover:bg-white/10"
                >
                  <Link to="/login">Log in / Sign up</Link>
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
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative rounded-2xl border ${accent} bg-card p-8`}
    >
      <span className="absolute right-6 top-6 font-headline text-4xl tracking-tighter text-white/10">
        {step}
      </span>
      <div
        className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="font-headline text-xl tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-8"
    >
      <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-pink-accent/10 text-pink-accent">
        {icon}
      </div>
      <h3 className="font-headline text-xl tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{body}</p>
    </motion.div>
  );
}

function Divider() {
  return (
    <div className="w-full py-4">
      <div className="container mx-auto h-px w-3/4 bg-white/10" />
    </div>
  );
}
