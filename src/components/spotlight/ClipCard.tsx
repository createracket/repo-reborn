import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Portrait (9:16) social clip card for spotlight pages.
 * Shows only the media artwork with our own overlay — no platform chrome.
 * Clicking opens the original post on the platform.
 */
export function ClipCard({
  href,
  provider,
  poster,
  caption,
}: {
  href: string;
  provider: "tiktok" | "instagram";
  poster?: string | null;
  caption?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showPoster = !!poster && !failed;
  const label = provider === "tiktok" ? "TikTok" : "Instagram";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch on ${label}`}
      className="group relative block overflow-hidden rounded-3xl border border-border/60 bg-muted/40 transition-colors hover:border-pink-accent/60"
      style={{ aspectRatio: "9 / 16" }}
    >
      {showPoster ? (
        <img
          src={poster!}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          className="size-full bg-gradient-to-br from-[#6a4de0] via-[#a175d4] to-[#efb3c4] transition-transform duration-500 group-hover:scale-105"
          aria-hidden="true"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

      <span
        className="absolute left-5 top-5 inline-flex items-center justify-center rounded-full bg-pink-accent p-2 text-primary-foreground"
        title={label}
      >
        {provider === "tiktok" ? (
          <Music2 className="size-4" aria-label={label} />
        ) : (
          <Instagram className="size-4" aria-label={label} />
        )}
      </span>

      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full border border-foreground/20 bg-foreground/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary">
          <Play className="size-6 translate-x-[1px] fill-current text-foreground transition-colors group-hover:text-primary-foreground" />
        </span>
      </span>

      <span className="absolute inset-x-6 bottom-6 block">
        {caption ? (
          <span className="mb-2 block font-display text-lg leading-tight text-foreground">
            {caption}
          </span>
        ) : null}
        <span className="flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            Watch now
          </span>
        </span>
      </span>
    </a>
  );
}
