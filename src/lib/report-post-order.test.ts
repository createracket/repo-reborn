import { describe, expect, test } from "bun:test";
import { compareReportPosts, reportPostTime } from "./report-post-order";

describe("live report recency", () => {
  test("new undated Stand Atlantic posts appear ahead of older dated posts", () => {
    const posts = [
      { id: "older", posted_at: "2026-10-14T12:02:17Z", created_at: "2026-10-14T12:24:37Z", position: 1 },
      { id: "instagram", posted_at: null, created_at: "2026-10-18T09:24:44Z", position: 106 },
      { id: "tiktok", posted_at: null, created_at: "2026-10-17T04:53:30Z", position: 0 },
    ];
    expect(posts.sort(compareReportPosts).map((p) => p.id)).toEqual(["instagram", "tiktok", "older"]);
    expect(posts[0].posted_at).toBeNull();
  });

  test("actual publication dates take priority over insertion dates", () => {
    expect(reportPostTime({ posted_at: "2026-05-25T00:00:00Z", created_at: "2026-10-18T00:00:00Z", position: 0 })).toBe(Date.parse("2026-05-25T00:00:00Z"));
  });

  test("posts with no valid timestamps remain last in builder order", () => {
    expect(compareReportPosts({ posted_at: null, position: 0 }, { posted_at: "2026-10-18", position: 1 })).toBe(1);
    expect(compareReportPosts({ posted_at: "invalid", position: 2 }, { posted_at: null, position: 5 })).toBe(-3);
  });
});