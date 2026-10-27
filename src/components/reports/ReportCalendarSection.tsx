import { useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reportCalendarPlatforms } from "@/lib/report-calendar-platforms";
import { REPORT_CALENDAR_TIMEZONE } from "@/lib/report-calendar-time";
import {
  RosterCalendar,
  CalendarSnapshotContent,
  initialMonth,
  datesOf,
  eventDatesOf,
  type CalendarCreator,
  type CalendarEvent,
} from "@/components/roster/RosterCalendar";

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Public report calendar with PNG snapshot + CSV export of dates, events and platform toggles. */
export function ReportCalendarSection({
  title,
  slug,
  creators,
  events,
  onPick,
}: {
  title: string;
  slug: string;
  creators: CalendarCreator[];
  events: CalendarEvent[];
  onPick: (id: string) => void;
}) {
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const [snapping, setSnapping] = useState(false);
  const snapRef = useRef<HTMLDivElement>(null);
  const snapMonth = month ?? initialMonth(creators);

  async function snapshot() {
    if (!snapRef.current) return;
    setSnapping(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const { toPng } = await import("html-to-image");
      const url = await toPng(snapRef.current, { width: 1080, height: 1080, pixelRatio: 1, skipFonts: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "report"}-calendar-${format(snapMonth, "yyyy-MM")}.png`;
      a.click();
      toast.success("Calendar snapshot downloaded");
    } catch {
      toast.error("Couldn't create the snapshot — try again");
    } finally {
      setSnapping(false);
    }
  }

  function exportCsv() {
    const platforms = reportCalendarPlatforms(slug);
    const header = ["date", "time", "timezone", "type", "name", "link", ...platforms];
    const rows: string[][] = [];
    for (const c of creators)
      for (const d of datesOf(c)) rows.push([d, "", "", "Creator post", c.name, "", ...platforms.map(() => "")]);
    for (const e of events)
      for (const d of eventDatesOf(e))
        rows.push([
          d,
          e.time ?? "",
          e.time ? e.timezone || REPORT_CALENDAR_TIMEZONE : "",
          "Key event",
          (e.label ?? "").trim(),
          e.url ?? "",
          ...platforms.map((p) => ((e.platforms ?? []).includes(p) ? "Yes" : "No")),
        ]);
    rows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "report"}-calendar.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="purple" onClick={exportCsv}>
          <Download className="mr-1.5 size-3.5" />
          Export as CSV
        </Button>
        <Button size="sm" variant="purple" onClick={snapshot} disabled={snapping}>
          <Camera className="mr-1.5 size-3.5" />
          {snapping ? "Creating image…" : "Download snapshot"}
        </Button>
      </div>
      <RosterCalendar creators={creators} events={events} month={month} onMonthChange={setMonth} onPick={onPick} />
      <div aria-hidden style={{ position: "fixed", top: 0, left: -10000 }}>
        <div ref={snapRef}>
          <CalendarSnapshotContent title={title} month={snapMonth} creators={creators} events={events} />
        </div>
      </div>
    </section>
  );
}
