import { test } from "node:test";
import { strict as assert } from "node:assert";
import { reviewEnabled, calendarEventKey, findCalendarEvent, reviewCommentSchema, normalizeDraftLink, draftDisplayTags, draftReviewRank, sortDraftsForReview } from "./report-review";

test("Review tab is only on the Chats and Tixel brand ads reports", () => {
  assert.equal(reviewEnabled("chats-socials"), true);
  assert.equal(reviewEnabled("tixel-brand-ads"), true);
  assert.equal(reviewEnabled("tixel-report"), false);
  assert.equal(reviewEnabled("stat-socials"), false);
});
test("Draft links resolve to the calendar entry and its platform tags", () => {
  const events = [{ date: "2026-11-10", time: "17:00", label: "Tour post", platforms: ["IG", "FB"] }];
  const key = calendarEventKey(events[0]);
  assert.deepEqual(findCalendarEvent(events, key)?.platforms, ["IG", "FB"]);
  assert.equal(findCalendarEvent(events, "nope"), null);
});
test("Comments are required and capped at 1000 characters", () => {
  const id = "00000000-0000-4000-8000-000000000000";
  assert.equal(reviewCommentSchema.safeParse({ draftId: id, body: " " }).success, false);
  assert.equal(reviewCommentSchema.safeParse({ draftId: id, body: "x".repeat(1001) }).success, false);
  assert.equal(reviewCommentSchema.safeParse({ draftId: id, body: "Change caption" }).success, true);
});
test("Draft content links accept web links only", () => {
  assert.equal(normalizeDraftLink("dropbox.com/s/abc"), "https://dropbox.com/s/abc");
  assert.equal(normalizeDraftLink("https://drive.google.com/x"), "https://drive.google.com/x");
  assert.equal(normalizeDraftLink("javascript:alert(1)"), null);
  assert.equal(normalizeDraftLink("   "), null);
});
test("Draft toggles are used first, then the linked calendar entry's tags", () => {
  assert.deepEqual(draftDisplayTags(["IG", "TBC"], ["TT"]), ["IG", "TBC"]);
  assert.deepEqual(draftDisplayTags([], ["TT", "FB"]), ["TT", "FB"]);
  assert.deepEqual(draftDisplayTags([], null), []);
});
test("Draft-tagged entries sort ahead of approved and untagged ones", () => {
  const drafts = [
    { id: "untagged-approved", hide_banner: true, approval_status: "approved" },
    { id: "tagged-approved", hide_banner: false, approval_status: "approved" },
    { id: "tagged-pending", hide_banner: false, approval_status: "pending" },
    { id: "tagged-amends", hide_banner: false, approval_status: "amends" },
    { id: "untagged-pending", hide_banner: true, approval_status: "pending" },
  ];
  assert.deepEqual(
    sortDraftsForReview(drafts).map((d) => d.id),
    ["tagged-pending", "tagged-amends", "tagged-approved", "untagged-approved", "untagged-pending"],
  );
  assert.equal(draftReviewRank({ hide_banner: false, approval_status: "pending" }), 0);
  assert.equal(draftReviewRank({ hide_banner: false, approval_status: "approved" }), 1);
  assert.equal(draftReviewRank({ hide_banner: true, approval_status: "approved" }), 2);
  assert.equal(sortDraftsForReview(drafts).length, drafts.length, "sorting must not drop entries");
});
