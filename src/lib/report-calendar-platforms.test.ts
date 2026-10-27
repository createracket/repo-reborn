import { test } from "node:test";
import { strict as assert } from "node:assert";
import { reportCalendarPlatforms } from "./report-calendar-platforms";

test("Stand Atlantic calendar offers Laylo, FB and TBC alongside existing platforms", () => {
  assert.deepEqual(reportCalendarPlatforms("stat-socials"), ["IG", "TT", "YT", "Trial", "Story", "Laylo", "FB", "TBC"]);
});

test("The Chats calendar offers Laylo, FB and TBC alongside existing platforms", () => {
  assert.deepEqual(reportCalendarPlatforms("chats-socials"), ["IG", "TT", "YT", "Trial", "Story", "Laylo", "FB", "TBC"]);
});

test("Every report builder now offers Laylo, FB and TBC, including Tixel", () => {
  assert.deepEqual(reportCalendarPlatforms("tixel-socials"), ["IG", "TT", "YT", "Trial", "Story", "Laylo", "FB", "TBC"]);
});
