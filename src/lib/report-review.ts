import { z } from "zod";

/** The Review (draft approval) tab is only on the Chats Socials report for now. */
export function reviewEnabled(slug: string) {
  return slug === "chats-socials";
}

type CalEvent = { date?: string | null; time?: string | null; label?: string | null; platforms?: string[] | null };

/** Stable link key for a calendar entry (calendar events have no ids). */
export function calendarEventKey(e: CalEvent) {
  return `${e.date ?? ""}|${(e.time ?? "").trim()}|${(e.label ?? "").trim()}`;
}

export function findCalendarEvent<T extends CalEvent>(events: T[] | null | undefined, key: string | null | undefined): T | null {
  if (!key) return null;
  return (events ?? []).find((e) => calendarEventKey(e) === key) ?? null;
}

export const reviewCommentSchema = z.object({
  draftId: z.string().uuid(),
  name: z.string().trim().max(80).optional().default(""),
  body: z.string().trim().min(1, "Add a comment").max(1000),
});
export const reviewApproveSchema = z.object({
  draftId: z.string().uuid(),
  name: z.string().trim().max(80).optional().default(""),
  approved: z.boolean(),
});
export const MAX_COMMENTS_PER_DRAFT = 50;

/** Private bucket for draft uploads; files are only reachable via short-lived signed links. */
export const DRAFT_MEDIA_BUCKET = "report-draft-media";
/** Signed links for the Review tab expire after an hour (the page re-signs on refresh). */
export const DRAFT_MEDIA_URL_TTL_SECONDS = 60 * 60;

/** Accepts an http(s) content link (adding https:// when missing); anything else returns null. */
export function normalizeDraftLink(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
