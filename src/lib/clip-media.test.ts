import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getClipMedia, getClipEmbedSrc, clipPlaysInline } from "./clip-media";

test("Admins can choose on-page playback or click-through independently of the legacy default", () => {
  assert.equal(clipPlaysInline("true"), true);
  assert.equal(clipPlaysInline("false", true), false);
  assert.equal(clipPlaysInline(undefined, true), true);
  assert.equal(clipPlaysInline(undefined), false);
});

test("TikTok social videos have an official inline player", () => {
  assert.equal(getClipEmbedSrc("https://www.tiktok.com/@creator/video/1234567890123456789"), "https://www.tiktok.com/player/v1/1234567890123456789");
  assert.equal(getClipEmbedSrc("https://tiktok.com.evil.example/@creator/video/123456"), null);
});

test("Tixel's first two Instagram links resolve to inline players", () => {
  assert.equal(getClipEmbedSrc("https://www.instagram.com/p/Dd6A3YYIe1w/"), "https://www.instagram.com/p/Dd6A3YYIe1w/embed/");
  assert.equal(getClipEmbedSrc("https://www.instagram.com/danielllagibson/reel/DeVqPFpz3kR/"), "https://www.instagram.com/reel/DeVqPFpz3kR/embed/");
});

test("Inline Instagram players reject unrelated hosts and insecure URLs", () => {
  assert.equal(getClipEmbedSrc("https://instagram.com.evil.example/p/ABC/"), null);
  assert.equal(getClipEmbedSrc("http://www.instagram.com/p/ABC/"), null);
  assert.equal(getClipEmbedSrc("https://www.dropbox.com/scl/fo/abc/folder"), null);
});

test("Dropbox single-file links use a direct inline video URL", () => {
  const media = getClipMedia("https://www.dropbox.com/scl/fi/abc/example.mp4?rlkey=secret&dl=0");
  assert.equal(media?.provider, "dropbox");
  assert.equal(media?.videoSrc, "https://www.dropbox.com/scl/fi/abc/example.mp4?rlkey=secret&raw=1");
  assert.equal(media?.href, "https://www.dropbox.com/scl/fi/abc/example.mp4?rlkey=secret&dl=0");
});

test("Dropbox folder links stay clickable instead of trying to play a ZIP", () => {
  const media = getClipMedia("https://www.dropbox.com/scl/fo/abc/folder?rlkey=secret&dl=0");
  assert.equal(media?.provider, "dropbox");
  assert.equal(media?.videoSrc, null);
  assert.equal(media?.href, "https://www.dropbox.com/scl/fo/abc/folder?rlkey=secret&dl=0");
});

test("Dropbox media validation rejects lookalike hosts and invalid links", () => {
  assert.equal(getClipMedia("https://dropbox.com.evil.example/scl/fi/abc/video.mp4"), null);
  assert.equal(getClipMedia("javascript:alert(1)"), null);
  assert.equal(getClipMedia("not a URL"), null);
});

test("Existing Instagram clips retain their original preview behaviour", () => {
  const media = getClipMedia("https://www.instagram.com/reel/ABC123/");
  assert.equal(media?.provider, "instagram");
  assert.equal(media?.href, "https://www.instagram.com/reel/ABC123/");
  assert.equal(media?.videoSrc, null);
});
