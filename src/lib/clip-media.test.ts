import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getClipMedia } from "./clip-media";

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
