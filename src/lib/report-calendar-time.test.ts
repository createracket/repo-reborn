import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calendarTimeLabel, compareCalendarEvents, REPORT_CALENDAR_TIMEZONE, validCalendarTime } from "./report-calendar-time";

test("24-hour inputs accept midnight and 23:59 but reject 12-hour and invalid times", () => {
  assert.equal(validCalendarTime("00:00"), true);
  assert.equal(validCalendarTime("23:59"), true);
  for (const time of ["24:00", "13:60", "5:30", "5:30pm"]) assert.equal(validCalendarTime(time), false);
});

test("posting times default to fixed AEDT", () => {
  assert.equal(REPORT_CALENDAR_TIMEZONE, "AEDT");
  assert.equal(calendarTimeLabel({ time: "17:21" }), "17:21 AEDT");
  assert.equal(calendarTimeLabel({}), "");
});

test("Order by date sorts newest date then latest posting time, with untimed and undated entries last", () => {
  const entries = [
    { id: "early", date: "2026-10-27", time: "09:30" },
    { id: "undated", date: "", time: "23:59" },
    { id: "untimed", date: "2026-10-27", time: "" },
    { id: "late", date: "2026-10-27", time: "17:21" },
    { id: "next-day", date: "2026-10-28", time: "00:00" },
  ];
  assert.deepEqual(entries.sort(compareCalendarEvents).map((e) => e.id), ["next-day", "late", "early", "untimed", "undated"]);
  assert.equal(compareCalendarEvents({ date: "" }, { date: "", time: "15:00" }), 0);
});