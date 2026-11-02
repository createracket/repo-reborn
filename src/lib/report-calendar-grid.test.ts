import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { calendarGridRange, skipsLoneSundayWeek } from "./report-calendar-grid";

const f = (d: Date) => format(d, "yyyy-MM-dd");

describe("calendarGridRange", () => {
  it("November 2026 on the Chats view starts on Monday 2nd", () => {
    const r = calendarGridRange(new Date(2026, 10, 15), { skipLoneSundayWeek: true });
    expect(f(r.start)).toBe("2026-11-02");
  });

  it("October 2026 still ends with the Mon 26 – Sun 1 Nov week", () => {
    const r = calendarGridRange(new Date(2026, 9, 15), { skipLoneSundayWeek: true });
    expect(f(r.start)).toBe("2026-09-28");
    expect(f(r.end)).toBe("2026-11-01");
  });

  it("other reports keep the Mon 26 Oct start for November", () => {
    expect(f(calendarGridRange(new Date(2026, 10, 15)).start)).toBe("2026-10-26");
  });

  it("only the Chats report opts in", () => {
    expect(skipsLoneSundayWeek("chats-socials")).toBe(true);
    expect(skipsLoneSundayWeek("stat-socials")).toBe(false);
  });
});
