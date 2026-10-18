import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { compareReportPosts, reportPostTime, newReportPostPosition } from "./report-post-order";

describe("live report recency", () => {
  test("new empty entries precede all existing builder posts, including previous additions", () => {
    const posts = [{ position: 4 }, { position: -2 }, { position: 0 }];
    const position = newReportPostPosition(posts);
    assert.equal(position, -3);
    assert.equal(newReportPostPosition([...posts, { position }]), -4);
    assert.deepEqual(posts.map((post) => post.position), [4, -2, 0]);
  });
  test("the first empty entry starts at position zero", () => {
    assert.equal(newReportPostPosition([]), 0);
  });
  test("new undated Stand Atlantic posts appear ahead of older dated posts", () => {
    const posts = [
      { id: "older", posted_at: "2026-10-14T12:02:17Z", created_at: "2026-10-14T12:24:37Z", position: 1 },
      { id: "instagram", posted_at: null, created_at: "2026-10-18T09:24:44Z", position: 106 },
      { id: "tiktok", posted_at: null, created_at: "2026-10-17T04:53:30Z", position: 0 },
    ];
    assert.deepEqual(posts.sort(compareReportPosts).map((p) => p.id), ["instagram", "tiktok", "older"]);
    assert.equal(posts[0].posted_at, null);
  });

  test("actual publication dates take priority over insertion dates", () => {
    assert.equal(reportPostTime({ posted_at: "2026-05-25T00:00:00Z", created_at: "2026-10-18T00:00:00Z", position: 0 }), Date.parse("2026-05-25T00:00:00Z"));
  });

  test("posts with no valid timestamps remain last in builder order", () => {
    assert.equal(compareReportPosts({ posted_at: null, position: 0 }, { posted_at: "2026-10-18", position: 1 }), 1);
    assert.equal(compareReportPosts({ posted_at: "invalid", position: 2 }, { posted_at: null, position: 5 }), -3);
  });
});