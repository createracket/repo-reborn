export const REPORT_CALENDAR_TIMEZONE = "AEDT";

export function validCalendarTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

type TimedEvent = { date?: string | null; time?: string | null; timezone?: string | null };

/** Calendar wall-clock times are fixed AEDT (UTC+11), independent of the viewer's timezone. */
/** Soonest date first, earliest posting time first; untimed and undated entries last. */
export function compareCalendarEvents(a: TimedEvent, b: TimedEvent): number {
  const aDate = (a.date || "").slice(0, 10);
  const bDate = (b.date || "").slice(0, 10);
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  const dateOrder = aDate.localeCompare(bDate);
  if (dateOrder) return dateOrder;
  const aTime = validCalendarTime(a.time ?? "") ? a.time ?? "" : "";
  const bTime = validCalendarTime(b.time ?? "") ? b.time ?? "" : "";
  if (!aTime && !bTime) return 0;
  if (!aTime) return 1;
  if (!bTime) return -1;
  return aTime.localeCompare(bTime);
}

export function calendarTimeLabel(event: TimedEvent): string {
  return validCalendarTime(event.time ?? "") ? `${event.time} ${event.timezone || REPORT_CALENDAR_TIMEZONE}` : "";
}