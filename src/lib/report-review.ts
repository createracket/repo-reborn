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
