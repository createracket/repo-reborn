import type { CSSProperties } from "react";

export type ThumbFit = "cover" | "contain";
export type ThumbBg = "card" | "black" | "white";
export type ThumbPosition = "top" | "center" | "bottom";

export interface ThumbFrame {
  fit: ThumbFit;
  bg: ThumbBg;
  /** Percentage, 50–150. 100 = untouched. */
  zoom: number;
  position: ThumbPosition;
}

export const DEFAULT_THUMB_FRAME: ThumbFrame = {
  fit: "cover",
  bg: "card",
  zoom: 100,
  position: "top",
};

/** Reads the framing settings stored on partner_pages.links.thumb_frame. */
export function readThumbFrame(links: unknown): ThumbFrame {
  const raw = (links as Record<string, any> | null | undefined)?.thumb_frame as
    | Partial<ThumbFrame>
    | undefined;
  if (!raw || typeof raw !== "object") return DEFAULT_THUMB_FRAME;
  const zoom = Number(raw.zoom);
  return {
    fit: raw.fit === "contain" ? "contain" : "cover",
    bg: raw.bg === "black" || raw.bg === "white" ? raw.bg : "card",
    zoom: Number.isFinite(zoom) ? Math.min(150, Math.max(50, zoom)) : 100,
    position:
      raw.position === "center" || raw.position === "bottom" ? raw.position : "top",
  };
}

/** Tailwind class for the tile wrapper behind the image. */
export function thumbFrameBgClass(frame: ThumbFrame): string {
  if (frame.bg === "black") return "bg-black";
  if (frame.bg === "white") return "bg-white";
  return "bg-muted";
}

/** Inline style for the <img> so the builder preview and dashboard tiles match. */
export function thumbFrameImgStyle(frame: ThumbFrame): CSSProperties {
  return {
    objectFit: frame.fit,
    objectPosition: `center ${frame.position}`,
    transform: frame.zoom === 100 ? undefined : `scale(${frame.zoom / 100})`,
    transformOrigin: `center ${frame.position}`,
  };
}
