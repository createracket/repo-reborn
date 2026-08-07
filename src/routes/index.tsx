import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Handshake, Link2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

import { useIsMobile } from "@/hooks/use-mobile";
import { HomeFaqs } from "@/components/site/HomeFaqs";
import createLogoTransparent from "@/assets/CR-Logo-Half-Colour.svg.asset.json";
import racketLogoIconLight from "@/assets/CR-Logo-Icon-Light.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

import video1 from "@/assets/videos/video-1.mp4.asset.json";
import video2 from "@/assets/videos/video-2.mp4.asset.json";
import video3 from "@/assets/videos/video-3.mp4.asset.json";
import video4 from "@/assets/videos/video-4.mp4.asset.json";
import video5 from "@/assets/videos/video-5.mp4.asset.json";
import video6 from "@/assets/videos/video-6.mp4.asset.json";
import video7 from "@/assets/videos/video-7.mp4.asset.json";
import video8 from "@/assets/videos/video-8.mp4.asset.json";
import video9 from "@/assets/videos/video-9.mp4.asset.json";
import video10 from "@/assets/videos/video-10.mp4.asset.json";
import video11 from "@/assets/videos/video-11.mp4.asset.json";
import video12 from "@/assets/videos/video-12.mp4.asset.json";

const homeVideos = [video1, video2, video3, video4, video5, video6, video7, video8, video9, video10, video11, video12];

import trustedLogos from "@/assets/home/trusted-logos.png.asset.json";
import communityMap from "@/assets/home/community-map.svg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Create Racket — Where cool collabs make real noise" },
      {
        name: "description",
        content:
          "We operate at the cultural edge of media and music, connecting artists and brands who genuinely vibe - not for the sake of it, but because they share audiences. No vanity deals. No bailing after the intro. Just fan-first partnerships that actually perform.",
      },
      { property: "og:title", content: "Create Racket" },
      { property: "og:description", content: "Where cool collabs make real noise." },
      { property: "og:url", content: "https://createracket.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://createracket.com/" }],
  }),
  component: Home,
});

// ─── Waitlist form (writes straight to mailing_list_subscribers) ──────────
function WaitlistForm({
  className,
  inputClassName,
  buttonClassName,
}: {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const res = await fetch("/api/public/waitlist-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage-waitlist", marketing_opt_in: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Couldn't join waitlist. Try again?");
        return;
      }
      setEmail("");
      setOpen(true);
    } catch (err) {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className?.includes("flex") ? "w-full" : undefined}>
      <form onSubmit={onSubmit} className={className}>
        <Input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className={inputClassName}
        />
        <Button type="submit" size="lg" disabled={busy} className={buttonClassName}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : "Join Waitlist"}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        By joining you agree to our{" "}
        <Link to="/terms" className="underline hover:text-primary">Terms</Link>
        {" "}and{" "}
        <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
        , and to receive emails from Create Racket. Unsubscribe anytime.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">You're in. 🎉</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Nice one! We'll be in touch as soon as access to Create Racket opens up — keep an eye on your inbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────
function Counter({ from, to, duration = 2.5 }: { from: number; to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed < duration * 1000) {
        setV(from + (to - from) * (elapsed / (duration * 1000)));
        requestAnimationFrame(tick);
      } else setV(to);
    };
    requestAnimationFrame(tick);
  }, [inView, from, to, duration]);
  return <span ref={ref}>{v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
}

import type { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const testimonials = [
  {
    id: 1,
    name: "Jenna",
    title: "Agency Partner, AU",
    quote:
      "Racket\u00A0went above and beyond to find the perfect talent for my client, all while maintaining incredibly quick response times. A smooth, efficient, genuinely enjoyable process.",
  },
  {
    id: 2,
    name: "Dale",
    title: "Artist, AU",
    quote:
      "As an artist, it's great to know these legends are on our side, connecting us with paying opportunities and making the process as easy-going as possible.",
  },
  {
    id: 3,
    name: "Grace",
    title: "Artist Manager, UK",
    quote:
      "Racket made it a breeze to create branded content that still resonated with real fans - it was easy!",
  },
];

function HeroAuthButton() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <Button asChild size="sm" variant="secondary" className="rounded-full">
      <Link to={signedIn ? "/dashboard" : "/login"}>
        {signedIn ? "Dashboard" : "Log in / Sign up"}
      </Link>
    </Button>
  );
}

function Home() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="voicenotes-gradient">
        <header className="container mx-auto flex items-center justify-between px-4 pt-6">
          <Link to="/">
            <img src={racketLogoIconLight.url} alt="Racket" className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex" />
          <div className="flex items-center gap-1">
            <HeroAuthButton />
          </div>



        </header>

        <main className="flex flex-grow items-center justify-center pt-12 pb-8 md:pt-20 md:pb-12">
          <motion.div
            className="mx-auto max-w-5xl px-4 text-center"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="mb-10">
              <img src={createLogoTransparent.url} alt="Create" fetchPriority="high" decoding="async" className="mx-auto h-44 w-auto md:h-56" />
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-headline text-4xl leading-tight tracking-tighter md:text-6xl"
            >
              <span className="text-pink-accent">Unskippable</span> <span className="text-white">collabs</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-snug text-white/90 md:text-xl"
            >
              We operate at the cultural edge of media and music, connecting artists and brands
              who genuinely vibe - not for the sake of it, but because they share audiences.
              No vanity deals. No bailing after the intro. Just fan-first partnerships that actually perform.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex justify-center px-2">
              {signedIn ? (
                <Button asChild size="lg" className="h-14 rounded-full md:h-16 md:text-lg">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <WaitlistForm
                  className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-3xl bg-white p-2 transition-shadow duration-300 focus-within:shadow-[0_0_20px_5px_rgba(255,255,255,0.5)] hover:shadow-[0_0_20px_5px_rgba(255,255,255,0.5)] sm:flex-row sm:items-center sm:rounded-full sm:py-2 sm:pl-6 sm:pr-2"
                  inputClassName="h-12 w-full min-w-0 flex-grow border-0 bg-transparent px-3 text-base text-[#2b2b2b] placeholder:text-[#2b2b2b]/70 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14 sm:px-0 md:text-lg md:h-16"
                  buttonClassName="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 sm:h-14 sm:w-auto md:h-16 md:text-lg"
                />
              )}
            </motion.div>


            <motion.div variants={fadeUp} className="mt-28 pb-8 md:mt-36 md:pb-12">
              <p className="mb-8 text-center text-sm tracking-wide text-white/80">Trusted by</p>
              <img
                src={trustedLogos.url}
                alt="Trusted by Unilever, Ticketmaster, Unified, Hogarth, Tixel, 19 Crimes, Transgenre, KFC, Fraks"
                loading="lazy"
                decoding="async"
                className="mx-auto h-5 w-auto max-w-full object-contain md:h-6"
              />

            </motion.div>
          </motion.div>
        </main>
      </div>

      {/* Curve into dark section */}
      <div className="-mt-12 rounded-t-[3rem] bg-[#2b2b2b]">
        {/* ── VIDEO MARQUEE ──────────────────────────────────────────── */}
        <section className="relative z-10 overflow-hidden pt-16 pb-4">
          <VideoMarquee />
        </section>

        {/* ── ECOSYSTEM ──────────────────────────────────────────────── */}
        <section id="ecosystem" className="relative z-10 py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div variants={fadeUp} className="space-y-6 text-center lg:text-left">
                <h2 className="font-headline text-4xl tracking-tighter text-white md:text-5xl">
                  Trusted by artists and brands, globally
                </h2>
                <div className="text-lg text-white/85">
                  We genuinely believe in the power of cool content to build audiences and foster brand loyalty. Our fan-built solution gives artists the tools to out-perform traditional media metrics. All while connecting marketers to a proven network of diverse creators - trusted by real fans.
                </div>
              </motion.div>

              <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-6">
                <EcosystemCard
                  icon={<Link2 />}
                  title="CONNECT"
                  body="Find the right partners to help fuel your next campaign or media activation - globally.&nbsp;"
                  bg="bg-primary text-primary-foreground"
                />
                <EcosystemCard
                  icon={<Handshake />}
                  title="COLLAB"
                  body="Put fans at the heart of your next project with bespoke content that cuts through the noise."
                  bg="bg-purple text-white"
                />
                <EcosystemCard
                  icon={<Users />}
                  title="CO-CREATE"
                  body="Build your own roster and brief verified partners who are on the same wavelength.&nbsp;"
                  bg="bg-pink-accent text-[#2b2b2b]"
                />
              </div>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── COMMUNITY MAP ──────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.h2
                variants={fadeUp}
                className="font-headline text-4xl tracking-tighter text-white md:text-5xl"
              >
                Fostering a global community
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
              >
                Racket removes the barrier to audience development - connecting musicians, media partners, publishers, and brands across the globe.
              </motion.p>
              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: "spring", stiffness: 120, damping: 10, mass: 0.8 }}
              >
                <div
                  className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #2b2256 0%, #5C37D0 100%)",
                  }}
                >
                  <img
                    src={communityMap.url}
                    alt="Map of the Create Racket global community"
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />

                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        <Divider />


        {/* ── TESTIMONIALS ───────────────────────────────────────────── */}
        <section id="testimonials" className="py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-headline text-4xl tracking-tighter text-white md:text-5xl">
              Fuelling long-lasting partnerships
            </h2>
            <motion.div
              className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {testimonials.map((t) => (
                <motion.div
                  key={t.id}
                  variants={fadeUp}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="h-full rounded-2xl border-0 bg-card text-foreground shadow-xl">
                    <CardContent className="space-y-6 p-6 text-center">
                      <p className="text-sm font-medium leading-relaxed text-balance">"{t.quote}"</p>
                      <div>
                        <p className="font-bold text-pink-accent">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ── COUNTER ────────────────────────────────────────────────── */}
        <section className="py-20">
          <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
            <motion.div
              className="container mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-brand-light p-8 text-[#2b2b2b] backdrop-blur-md"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={stagger}
            >
              <div className="text-center">
                <motion.p variants={fadeUp} className="mb-6 text-lg font-bold md:text-xl">
                  Unlocking sustainable revenue streams for musicians at every stage of their
                  careers.
                </motion.p>
                <motion.p variants={fadeUp} className="mt-4 text-lg font-light text-[#2b2b2b]/80 md:text-xl">
                  Racket helps brands to actively invest in culture, already shifting
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="my-4 font-headline text-6xl tracking-tighter text-purple md:text-8xl"
                >
                  <Counter from={0} to={66947847} duration={2.5} />
                </motion.h2>
                <motion.p variants={fadeUp} className="text-lg font-light text-[#2b2b2b]/80 md:text-xl">
                  in equivalent Spotify streams 💸
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <HomeFaqs />
      </div>

      <SiteFooter />
    </div>
  );
}

function EcosystemCard({
  icon,
  title,
  body,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  bg: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={`rounded-2xl border-0 shadow-lg ${bg}`}>
        <CardHeader className="flex flex-row items-center justify-center gap-3 lg:justify-start">
          {icon}
          <CardTitle className="font-headline text-xl md:text-2xl tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center lg:text-left">
          <p>{body}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function VideoMarquee() {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState<Record<number, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const clips = isMobile ? homeVideos.slice(0, 6) : homeVideos;
  const items = [...clips, ...clips];

  // Only start loading/playing once the marquee is near the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Attach sources + play only for clips currently on screen.
  useEffect(() => {
    if (!armed) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            const src = v.dataset.src;
            if (src && !v.src) v.src = src;
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { rootMargin: "600px" },
    );
    videoRefs.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [armed, items.length]);

  function handleEnter(i: number) {
    setHovered(i);
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === i) v.play().catch(() => {});
      else v.pause();
    });
  }

  function handleLeave() {
    setHovered(null);
    videoRefs.current.forEach((v) => v?.play().catch(() => {}));
  }

  return (
    <div
      ref={containerRef}
      className="flex w-max gap-4 animate-marquee"
      style={{
        animationDuration: "80s",
        animationPlayState: hovered !== null ? "paused" : "running",
      }}
    >
      {items.map((v, i) => {
        // Eager-load the first couple of clips so something is visibly playing fast.
        const eager = i < 2;
        return (
          <div
            key={i}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            className="w-[200px] shrink-0 overflow-hidden rounded-2xl shadow-lg sm:w-[240px] md:w-[280px]"
          >
            <div className="relative aspect-[9/16] bg-white/5">
              <div
                className={`absolute inset-0 bg-[linear-gradient(135deg,#5C37D0_0%,#FF6FB5_100%)] transition-opacity duration-500 ${
                  ready[i] ? "opacity-0" : "opacity-40 animate-pulse"
                }`}
              />
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={eager ? v.url : undefined}
                data-src={v.url}
                muted
                loop
                autoPlay={eager}
                playsInline
                preload={eager ? "auto" : "none"}
                onLoadedData={() => setReady((r) => (r[i] ? r : { ...r, [i]: true }))}
                className={`relative h-full w-full object-cover transition-opacity duration-500 ${
                  ready[i] ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}






function Divider() {
  return (
    <div className="w-full py-4">
      <div className="container mx-auto h-px w-3/4 bg-white/10" />
    </div>
  );
}
