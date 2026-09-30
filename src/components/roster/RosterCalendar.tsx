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
};

const MAX_PER_DAY = 3;

function initialMonth(creators: CalendarCreator[]): Date {
  const today = format(new Date(), "yyyy-MM-dd");
  const dates = creators
    .map((c) => c.posting_date)
    .filter((d): d is string => !!d)
    .sort();
  const next = dates.find((d) => d >= today);
  return startOfMonth(next ? parseISO(next) : new Date());
}

function Chip({ c, onPick }: { c: CalendarCreator; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(c.id)}
      className="flex w-full items-center gap-1.5 rounded-full bg-lime px-1.5 py-0.5 text-left text-[11px] font-medium text-primary-foreground transition hover:bg-lime/85"
      title={c.name}
    >
      <span className="size-4 shrink-0 overflow-hidden rounded-full bg-background/40">
        {c.avatar_url ? (
          <img
            src={storageImage(c.avatar_url, { width: 32, height: 32 })}
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

export function RosterCalendar({
  creators,
  onPick,
}: {
  creators: CalendarCreator[];
  onPick: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => initialMonth(creators));
  const [openDay, setOpenDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarCreator[]>();
    for (const c of creators) {
      if (!c.posting_date) continue;
      const k = c.posting_date.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [creators]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const monthDays = days.filter((d) => isSameMonth(d, month) && byDay.has(format(d, "yyyy-MM-dd")));

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-5">
      <div className="mb-4 flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[10rem] text-center font-display text-lg">{format(month, "MMMM yyyy")}</div>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
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
            const inMonth = isSameMonth(d, month);
            const expanded = openDay === key;
            const shown = expanded ? list : list.slice(0, MAX_PER_DAY);
            return (
              <div
                key={key}
                className={`min-h-24 rounded-lg border p-1.5 ${inMonth ? "border-border/60 bg-background" : "border-transparent bg-muted/20 opacity-50"} ${isToday(d) ? "ring-2 ring-pink-accent" : ""}`}
              >
                <div className="mb-1 text-xs text-muted-foreground">{format(d, "d")}</div>
                <div className="space-y-1">
                  {shown.map((c) => (
                    <Chip key={c.id} c={c} onPick={onPick} />
                  ))}
                  {list.length > MAX_PER_DAY && (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setOpenDay(expanded ? null : key)}
                    >
                      {expanded ? "Show less" : `+${list.length - MAX_PER_DAY} more`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-3 sm:hidden">
        {monthDays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No posts scheduled this month.</p>
        ) : (
          monthDays.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            return (
              <div key={key}>
                <div className={`mb-1 text-xs font-medium ${isToday(d) ? "text-pink-accent" : "text-muted-foreground"}`}>
                  {format(d, "EEE d MMM")}
                </div>
                <div className="space-y-1">
                  {(byDay.get(key) ?? []).map((c) => (
                    <Chip key={c.id} c={c} onPick={onPick} />
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
