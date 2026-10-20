import { test } from "node:test";
import { strict as assert } from "node:assert";
import { reportCalendarPlatforms } from "./report-calendar-platforms";

test("Stand Atlantic calendar offers Laylo alongside existing platforms", () => {
  assert.deepEqual(reportCalendarPlatforms("stat-socials"), ["IG", "TT", "YT", "Trial", "Story", "Laylo"]);
});

test("The Chats calendar offers Laylo alongside existing platforms", () => {
  assert.deepEqual(reportCalendarPlatforms("chats-socials"), ["IG", "TT", "YT", "Trial", "Story", "Laylo"]);
});

test("Other reports retain their existing calendar options", () => {
  assert.deepEqual(reportCalendarPlatforms("tixel-socials"), ["IG", "TT", "YT", "Trial", "Story"]);
});