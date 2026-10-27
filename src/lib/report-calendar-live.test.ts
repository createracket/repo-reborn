import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calendarEntriesByLive } from "./report-calendar-live";

test("Live entries move into the admin Live group without removing or reordering calendar data", () => {
  const entries = [{ id: "first" }, { id: "completed", live: true }, { id: "pending", live: false }];
  const groups = calendarEntriesByLive(entries);
  assert.deepEqual(groups.active.map((e) => e.id), ["first", "pending"]);
  assert.deepEqual(groups.live.map((e) => e.id), ["completed"]);
  assert.deepEqual(entries.map((e) => e.id), ["first", "completed", "pending"]);
  assert.equal(groups.active.length + groups.live.length, entries.length);
});

test("Switching Live off restores the entry to the active admin group", () => {
  const groups = calendarEntriesByLive([{ id: "restored", live: false }]);
  assert.deepEqual(groups.active.map((e) => e.id), ["restored"]);
  assert.equal(groups.live.length, 0);
});