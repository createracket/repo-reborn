import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform } from "./youtube-utils";

describe("detectPlatform", () => {
  test("detects Facebook post URLs as facebook", () => {
    assert.equal(detectPlatform("https://www.facebook.com/watch/?v=123456"), "facebook");
    assert.equal(detectPlatform("https://www.facebook.com/creatorpage/videos/98765/"), "facebook");
    assert.equal(detectPlatform("https://fb.watch/abc123/"), "facebook");
    assert.equal(detectPlatform("https://m.facebook.com/story.php?story_fbid=1&id=2"), "facebook");
  });
  test("still detects the existing platforms", () => {
    assert.equal(detectPlatform("https://www.instagram.com/p/DeoOSTfEkxQ/"), "instagram");
    assert.equal(detectPlatform("https://www.tiktok.com/@creator/video/123"), "tiktok");
    assert.equal(detectPlatform("https://youtu.be/abc123"), "youtube");
    assert.equal(detectPlatform("https://www.youtube.com/shorts/abc123"), "youtube");
  });
  test("returns null for unrelated URLs", () => {
    assert.equal(detectPlatform("https://example.com/video"), null);
    assert.equal(detectPlatform(""), null);
  });
});
