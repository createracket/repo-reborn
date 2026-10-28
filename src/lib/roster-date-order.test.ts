import assert from "node:assert/strict";
import { test } from "node:test";
import { compareRosterBySoonestDate } from "./roster-date-order";

test("undated creators sort after dated creators (soonest first)", () => {
  // index fallback preserves original order among ties
  assert.ok(compareRosterBySoonestDate("", "2026-11-01", 0) > 0, "undated after dated");
  assert.ok(compareRosterBySoonestDate("2026-11-01", "", 0) < 0, "dated before undated");
  assert.ok(compareRosterBySoonestDate("2026-11-01", "2026-11-05", 0) < 0, "soonest first");
  assert.ok(compareRosterBySoonestDate(undefined, "2026-11-01", 0) > 0, "null/undefined counts as undated");
  assert.equal(compareRosterBySoonestDate("2026-11-01", "2026-11-01", 3), 3, "ties fall back to index");
  assert.equal(compareRosterBySoonestDate("", "", 2), 2, "both undated fall back to index");
});
