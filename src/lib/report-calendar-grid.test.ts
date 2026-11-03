import { test } from "node:test";
import { strict as assert } from "node:assert";
import { format } from "date-fns";
import { calendarGridRange, skipsLoneSundayWeek } from "./report-calendar-grid";

const f = (d: Date) => format(d, "yyyy-MM-dd");

test("November 2026 on the Chats view starts on Monday 2nd", () => {
  const r = calendarGridRange(new Date(2026, 10, 15), { skipLoneSundayWeek: true });
  assert.equal(f(r.start), "2026-11-02");
});

test("October 2026 still ends with the Mon 26 – Sun 1 Nov week", () => {
  const r = calendarGridRange(new Date(2026, 9, 15), { skipLoneSundayWeek: true });
  assert.equal(f(r.start), "2026-09-28");
  assert.equal(f(r.end), "2026-11-01");
});

test("other reports keep the Mon 26 Oct start for November", () => {
  assert.equal(f(calendarGridRange(new Date(2026, 10, 15)).start), "2026-10-26");
});

test("only the Chats report opts in", () => {
  assert.equal(skipsLoneSundayWeek("chats-socials"), true);
  assert.equal(skipsLoneSundayWeek("stat-socials"), false);
});

test("Phone list keeps Sunday 1 November in November even when the grid skips it", () => {
  const nov = new Date(2026, 10, 1);
  const days = calendarListDays(nov);
  assert.equal(days.length, 30);
  assert.equal(days[0].getDate(), 1);
  assert.equal(days[0].getMonth(), 10);
});
