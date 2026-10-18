import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { withVisibleRosterRate } from "./roster-visible-rate";

describe("protected roster rate projection", () => {
  test("Show rate enabled returns the saved AUD rate", () => {
    assert.deepEqual(withVisibleRosterRate({ id: "creator", budget: 2200, show_rate: true }), { id: "creator", rate: 2200 });
  });
  test("Show rate disabled never returns private pricing", () => {
    const result = withVisibleRosterRate({ id: "creator", budget: 5000, show_rate: false });
    assert.deepEqual(result, { id: "creator", rate: null });
    assert.equal("budget" in result, false);
    assert.equal("show_rate" in result, false);
  });
  test("a visible creator with no saved rate returns null", () => {
    assert.equal(withVisibleRosterRate({ budget: null, show_rate: true }).rate, null);
  });
});