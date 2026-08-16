import type { ReactNode } from "react";

import {
  DEFAULT_THUMB_FRAME,
  thumbFrameBgClass,
  thumbFrameImgStyle,
  type ThumbFrame,
} from "@/lib/thumb-frame";

interface Props {
  /** Square-ish image for the tile. Falls back to a lettered placeholder. */
  thumb?: string | null;
  frame?: ThumbFrame;
  title: string;
  subtitle?: ReactNode;
  /** Small chip under the title, e.g. "Brief" or "Roster". */
  label?: string;
  /** Optional right-hand slot (status badge, arrow). */
  trailing?: ReactNode;
  interactive?: boolean;
}

/** Shared 1:1-thumbnail tile used by every Project planner item. */
export function PlannerTile({
  thumb,
  frame = DEFAULT_THUMB_FRAME,
  title,
  subtitle,
  label,
  trailing,
  interactive = true,
}: Props) {
  const initials = (label || title || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="group flex h-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:border-lime">
      <div className={`size-16 shrink-0 overflow-hidden rounded-lg ${thumbFrameBgClass(frame)}`}>
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="size-full" style={thumbFrameImgStyle(frame)} />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted font-display text-lg text-muted-foreground">
            {initials}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={`truncate text-sm font-medium leading-tight ${
                interactive ? "group-hover:text-primary" : ""
              }`}
            >
              {title}
            </h3>
            {subtitle ? (
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{subtitle}</div>
            ) : null}
            {label ? (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                {label}
              </span>
            ) : null}
          </div>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
      </div>
    </div>
  );
}
