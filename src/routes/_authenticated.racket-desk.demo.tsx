import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bookmark,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  LayoutDashboard,
  Music2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { trends } from "@/lib/racket-desk/trends";

export const Route = createFileRoute("/_authenticated/racket-desk/demo")({
  head: () => ({
    meta: [
      { title: "Take the tour · Racket Desk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const example = trends[0];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-border bg-card p-8 sm:p-10">
        <div className="text-xs uppercase tracking-[0.24em] text-lime">Onboarding · 4 min read</div>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          A desk that thinks like a <span className="text-lime">creative partner</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Racket pulls the trends worth making today across TikTok, Instagram and YouTube in the
          UK, US and Australia — then tells you the format, the proof and the artist on your roster
          it fits. This is a quick tour of how the pieces fit together.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/racket-desk"
            className="inline-flex items-center gap-1.5 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Jump into today's brief <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#step-1"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-5 py-2.5 text-sm font-medium hover:border-lime/60"
          >
            Start the tour
          </a>
        </div>
      </section>

      <ol className="mt-12 space-y-10">
        <Step id="step-1" n="01" icon={LayoutDashboard} title="Start every morning on Today"
          body="Your daily brief opens with six formats worth making. Each one is rising, low-competition, and mapped to a region and category — music or culture — so you can triage in under two minutes."
          bullets={[
            "Stat strip: what's breaking, what matches your artists, what's already drafted.",
            "Filters for platform, region and category sit at the top of the feed.",
            "Refreshed at least daily. The header shows the sync clock.",
          ]}
        />
        <Step id="step-2" n="02" icon={Flame} title="Read a trend card"
          body="Every card gives you the proof at a glance — a preview, the creator handle, the hook line — plus a heat score and velocity so you know if it's rising or already peaking.">
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[280px_1fr]">
            <PreviewCard trend={example} />
            <ul className="space-y-3 text-sm">
              <Anno label="Platform + region pill" text="Where the format lives right now." />
              <Anno label="Creator handle" text="Who's driving it — click to the original." />
              <Anno label="Hook line" text="The exact caption / on-screen line that works." />
              <Anno label="Heat + velocity" text="0–100 score and whether it's rising, peaking or steady." />
            </ul>
          </div>
        </Step>
        <Step n="03" icon={ExternalLink} title="See it live — proof in one click"
          body='The "See live" button opens the original TikTok, Reel or Short in a new tab. Every card carries two to three curated example URLs so you can show a stakeholder the trend is real before you brief it.' />
        <Step n="04" icon={Copy} title="Copy the format, not just the idea"
          body='"Copy format" opens a breakdown of exactly how the trend is built — the first three seconds, the cut structure, how the audio is treated, and the caption / CTA pattern. Hand this to an editor and they can execute without watching 40 examples.'
          bullets={[
            "Hook (0–3s): what the viewer sees before they scroll.",
            "Structure: cut pattern and total length.",
            "Audio treatment: pitch, tempo, voiceover mix.",
            "Caption / CTA: the language pattern that lands.",
          ]}
        />
        <Step n="05" icon={Music2} title="Match trends to your roster"
          body="The Roster Matches card on the right rail cross-references live trends against artists you've added. When a format fits — genre, region, audience age — it surfaces here first, so you're not making generic content." />
        <Step n="06" icon={Sparkles} title="Trust the strategist note"
          body="Once a day the strategist note zooms out: which sound family is compounding, which region leads, what to bet on this week. Treat it as the desk's editorial POV — a starting point for a brief, not the final word." />
        <Step n="07" icon={Bookmark} title="Save, draft, ship"
          body="Bookmark trends to Saved Briefs, use Draft Angle to spin a hook into a starter script for a specific artist, and send the result to your team. The whole loop is designed to sit inside your existing workflow." />
      </ol>

      <section className="mt-14 rounded-2xl border border-border bg-card p-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Where to go next</div>
        <h2 className="mt-2 font-display text-2xl">Pick your first move</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NextCard to="/racket-desk" icon={LayoutDashboard} title="Today's brief" body="See what's breaking right now across UK, US and AU." />
          <NextCard to="/racket-desk/fan-intel" icon={Compass} title="Fan intel" body="What your fans are saying and who they engage with next." />
          <NextCard to="/racket-desk/profiles" icon={Wand2} title="My profiles" body="Add channels and get a daily idea tailored to your artists." />
        </div>
      </section>
    </div>
  );
}

function Step({ id, n, icon: Icon, title, body, bullets, children }: {
  id?: string; n: string; icon: React.ComponentType<{ className?: string }>;
  title: string; body: string; bullets?: string[]; children?: React.ReactNode;
}) {
  return (
    <li id={id} className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-[80px_1fr] sm:p-8">
      <div className="flex sm:flex-col sm:items-start sm:gap-3">
        <div className="font-display text-3xl text-lime">{n}</div>
        <div className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border sm:ml-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <h3 className="font-display text-xl leading-snug">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {bullets && (
          <ul className="mt-4 space-y-2 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-lime" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </li>
  );
}

function PreviewCard({ trend }: { trend: (typeof trends)[number] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground">{trend.creator}</div>

      <div className="p-3">
        <div className="text-[11px] text-muted-foreground">{trend.platform} · {trend.region}</div>
        <div className="mt-0.5 font-display text-sm leading-snug">{trend.title}</div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-lime">
            <Flame className="h-3 w-3" /> {trend.heat}
          </span>
          <span className="text-muted-foreground">{trend.velocity}</span>
        </div>
      </div>
    </div>
  );
}

function Anno({ label, text }: { label: string; text: string }) {
  return (
    <li className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-lime">{label}</div>
      <div className="mt-1 text-sm">{text}</div>
    </li>
  );
}

function NextCard({ to, icon: Icon, title, body }: {
  to: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string;
}) {
  return (
    <Link to={to} className="group flex flex-col rounded-xl border border-border bg-background/40 p-4 transition hover:border-lime/60">
      <Icon className="h-5 w-5 text-lime" />
      <div className="mt-3 font-display text-base">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
      <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
