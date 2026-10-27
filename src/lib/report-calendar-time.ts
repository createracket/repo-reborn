export const REPORT_CALENDAR_TIMEZONE = "AEDT";

export function validCalendarTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

type TimedEvent = { date?: string | null; time?: string | null; timezone?: string | null };

/** Calendar wall-clock times are fixed AEDT (UTC+11), independent of the viewer's timezone. */
export function compareCalendarEvents(a: TimedEvent, b: TimedEvent): number {
  const dateOrder = (b.date || "").slice(0, 10).localeCompare((a.date || "").slice(0, 10));
  if (dateOrder) return dateOrder;
  if (!a.date && !b.date) return 0;
  const aTime = validCalendarTime(a.time ?? "") ? a.time ?? "" : "";
  const bTime = validCalendarTime(b.time ?? "") ? b.time ?? "" : "";
  return bTime.localeCompare(aTime);
}

export function calendarTimeLabel(event: TimedEvent): string {
  return validCalendarTime(event.time ?? "") ? `${event.time} ${event.timezone || REPORT_CALENDAR_TIMEZONE}` : "";
}