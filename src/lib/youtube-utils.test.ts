import { describe, expect, it } from "vitest";
import { detectPlatform } from "./youtube-utils";

describe("detectPlatform", () => {
  it("detects Facebook post URLs as facebook", () => {
    expect(detectPlatform("https://www.facebook.com/watch/?v=123456")).toBe("facebook");
    expect(detectPlatform("https://www.facebook.com/creatorpage/videos/98765/")).toBe("facebook");
    expect(detectPlatform("https://fb.watch/abc123/")).toBe("facebook");
    expect(detectPlatform("https://m.facebook.com/story.php?story_fbid=1&id=2")).toBe("facebook");
  });

  it("still detects the existing platforms", () => {
    expect(detectPlatform("https://www.instagram.com/p/DeoOSTfEkxQ/")).toBe("instagram");
    expect(detectPlatform("https://www.tiktok.com/@creator/video/123")).toBe("tiktok");
    expect(detectPlatform("https://youtu.be/abc123")).toBe("youtube");
    expect(detectPlatform("https://www.youtube.com/shorts/abc123")).toBe("youtube");
  });

  it("returns null for unrelated URLs", () => {
    expect(detectPlatform("https://example.com/video")).toBeNull();
    expect(detectPlatform("")).toBeNull();
  });
});
