import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storageImage } from "@/lib/storage-image";

export type CalendarCreator = {
  id: string;
  name: string;
  avatar_url: string | null;
  posting_date?: string | null;
  extra_posting_dates?: string[] | null;
};

export type CalendarEvent = {
  date?: string | null;
  label?: string | null;
};

export function datesOf(c: CalendarCreator): string[] {
  const all = [c.posting_date, ...(c.extra_posting_dates ?? [])]
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10));
  return [...new Set(all)];
}

export function eventDatesOf(e: CalendarEvent): string[] {
  return (e.date ?? "").slice(0, 10) ? [(e.date as string).slice(0, 10)] : [];
}

const MAX_PER_DAY = 3;
const MAX_SNAPSHOT_PER_DAY = 4;

export function initialMonth(creators: CalendarCreator[]): Date {
  const today = format(new Date(), "yyyy-MM-dd");
  const dates = creators
    .flatMap(datesOf)
    .sort();
  const next = dates.find((d) => d >= today);
  return startOfMonth(next ? parseISO(next) : new Date());
}

function Chip({ c, onPick, large }: { c: CalendarCreator; onPick: (id: string) => void; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onPick(c.id)}
      className={`flex w-full items-center rounded-full bg-lime text-left font-medium text-primary-foreground transition hover:bg-lime/85 report-light:text-foreground ${large ? "gap-2.5 px-2 py-1.5 text-sm" : "gap-1.5 px-1.5 py-0.5 text-[11px]"}`}
      title={c.name}
    >
      <span className={`shrink-0 overflow-hidden rounded-full bg-background/40 ${large ? "size-8" : "size-4"}`}>
        {c.avatar_url ? (
          <img
            src={storageImage(c.avatar_url, { width: 64, height: 64 })}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : null}
      </span>
      <span className="truncate">{c.name}</span>
    </button>
  );
}

/** Key event marker — a moment to cover without a creator attached. */
function EventChip({ e, large }: { e: CalendarEvent; large?: boolean }) {
  const label = (e.label ?? "").trim() || "Event";
  return (
    <div
      className={`flex w-full items-center rounded-full border border-pink-accent bg-pink-accent/10 text-left font-medium text-pink-accent report-light:border-pink-ink report-light:text-pink-ink ${large ? "px-2.5 py-1.5 text-sm" : "px-2 py-0.5 text-[11px]"}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}

export function RosterCalendar({
  creators,
  events = [],
  onPick,
  month: monthProp,
  onMonthChange,
}: {
  creators: CalendarCreator[];
  events?: CalendarEvent[];
  onPick: (id: string) => void;
  /** Controlled month (used so the snapshot captures the month being viewed). */
  month?: Date | null;
  onMonthChange?: (m: Date) => void;
}) {
  const [internalMonth, setInternalMonth] = useState(() => initialMonth(creators));
  const month = monthProp ?? internalMonth;
  const setMonth = (next: Date) => (onMonthChange ? onMonthChange(next) : setInternalMonth(next));
  const [openDay, setOpenDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarCreator[]>();
    for (const c of creators) {
      for (const k of datesOf(c)) m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [creators]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      for (const k of eventDatesOf(e)) m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [events]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const monthDays = days.filter(
    (d) => isSameMonth(d, month) && (byDay.has(format(d, "yyyy-MM-dd")) || eventsByDay.has(format(d, "yyyy-MM-dd"))),
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 report-light:border-border/40 report-light:bg-muted/60 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:justify-center sm:gap-4">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[10rem] text-center font-display text-lg">{format(month, "MMMM yyyy")}</div>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(d, month);
            const expanded = openDay === key;
            const shown = expanded ? list : list.slice(0, MAX_PER_DAY);
            const overflow = list.length - shown.length;
            return (
              <div
                key={key}
                className={`min-h-24 rounded-lg border p-1.5 ${inMonth ? "border-border/60 bg-background report-light:border-border/30 report-light:bg-card" : "border-transparent bg-muted/20 opacity-50 report-light:bg-muted/40"} ${isToday(d) ? "ring-2 ring-pink-accent report-light:ring-pink-ink" : ""}`}
              >
                <div className={`mb-1 text-xs ${isToday(d) ? "font-semibold text-pink-accent report-light:text-pink-ink" : "text-muted-foreground"}`}>{format(d, "d")}</div>
                <div className="space-y-1">
                  {dayEvents.map((e, i) => (
                    <EventChip key={`ev-${i}`} e={e} />
                  ))}
                  {shown.map((c) => (
                    <Chip key={c.id} c={c} onPick={onPick} />
                  ))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setOpenDay(expanded ? null : key)}
                    >
                      {expanded ? "Show less" : `+${overflow} more`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-2 sm:hidden">
        {monthDays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No posts or key events scheduled this month.</p>
        ) : (
          monthDays.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            return (
              <div key={key} className="flex gap-3 rounded-xl border border-border/60 bg-background p-2.5 report-light:border-border/30 report-light:bg-card">
                <div className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-lg py-1 ${isToday(d) ? "bg-pink-accent text-foreground report-light:text-pink-ink" : "bg-muted/50"}`}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                  <span className="font-display text-lg leading-none">{format(d, "d")}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {(eventsByDay.get(key) ?? []).map((e, i) => (
                    <EventChip key={`ev-${i}`} e={e} large />
                  ))}
                  {(byDay.get(key) ?? []).map((c) => (
                    <Chip key={c.id} c={c} onPick={onPick} large />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Static, square (1080x1080) render of the month used for the PNG snapshot.
 * Kept text-only so the exported file stays small and renders reliably.
 */
export function CalendarSnapshotContent({
  title,
  month,
  creators,
  events = [],
}: {
  title: string;
  month: Date;
  creators: CalendarCreator[];
  events?: CalendarEvent[];
}) {
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarCreator[]>();
    for (const c of creators) {
      for (const k of datesOf(c)) m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [creators]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      for (const k of eventDatesOf(e)) m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [events]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div
      className="flex h-full w-full flex-col bg-background p-12 text-foreground"
      style={{ width: 1080, height: 1080 }}
    >
      <div className="flex items-baseline justify-between gap-6 pb-6">
        <div className="truncate font-display text-4xl font-semibold">{title}</div>
        <div className="shrink-0 text-2xl text-muted-foreground">{format(month, "MMMM yyyy")}</div>
      </div>
      <div className="grid grid-cols-7 gap-2 pb-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-2">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = byDay.get(key) ?? [];
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(d, month);
          const shown = list.slice(0, MAX_SNAPSHOT_PER_DAY);
          const overflow = list.length - shown.length;
          return (
            <div
              key={key}
              className={`overflow-hidden rounded-xl border p-2 ${inMonth ? "border-border/60 bg-card" : "border-transparent bg-muted/40 opacity-50"} ${isToday(d) ? "ring-2 ring-pink-accent" : ""}`}
            >
              <div className={`mb-1 text-sm ${isToday(d) ? "font-semibold text-pink-accent" : "text-muted-foreground"}`}>{format(d, "d")}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((e, i) => (
                  <div
                    key={`ev-${i}`}
                    className="truncate rounded-full border border-pink-accent px-2 py-0.5 text-[11px] font-medium text-pink-accent"
                  >
                    {(e.label ?? "").trim() || "Event"}
                  </div>
                ))}
                {shown.map((c) => (
                  <div
                    key={c.id}
                    className="truncate rounded-full bg-lime px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
                    title={c.name}
                  >
                    {c.name}
                  </div>
                ))}
                {overflow > 0 && <div className="text-[11px] text-muted-foreground">+{overflow} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
