import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, getDay, startOfMonth, startOfWeek } from "date-fns";

// Reports whose live calendar hides a leading week that holds only a Sunday 1st
// (that week already closes the previous month's grid).
const SKIP_LONE_SUNDAY_WEEK_SLUGS = new Set(["chats-socials"]);

export function skipsLoneSundayWeek(slug: string | null | undefined): boolean {
  return !!slug && SKIP_LONE_SUNDAY_WEEK_SLUGS.has(slug);
}

/**
 * Monday-start month grid bounds. With skipLoneSundayWeek, a month starting on a
 * Sunday begins its grid on Monday the 2nd. Display only — never use this to
 * decide which dates count towards a month's reporting.
 */
export function calendarGridRange(month: Date, opts: { skipLoneSundayWeek?: boolean } = {}) {
  const first = startOfMonth(month);
  const start =
    opts.skipLoneSundayWeek && getDay(first) === 0 ? addDays(first, 1) : startOfWeek(first, { weekStartsOn: 1 });
  return { start, end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) };
}

/** Every day of the month for the phone list — never trimmed by the desktop grid. */
export function calendarListDays(month: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
}
