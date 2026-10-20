import { test } from "node:test";
import { strict as assert } from "node:assert";
import { listeningEnabled, listeningAnalysisSchema, listeningDisclaimerSchema, isListeningContentUrl } from "./campaign-listening";
test("Listening is enabled for Chats", () => {
  assert.equal(listeningEnabled("chats-socials"), true);
});
test("Listening is enabled for Stand Atlantic", () => {
  assert.equal(listeningEnabled("stat-socials"), true);
});
test("Listening is not enabled for other reports", () => {
  assert.equal(listeningEnabled("tixel-socials"), false);
});
test("Public listening content excludes private fields and unsafe links", () => {
  const analysis = listeningAnalysisSchema.parse({ notes: "private", email: "private", topPosts: [{ url: "javascript:alert(1)" }] });
  assert.equal("notes" in analysis, false);
  assert.equal("email" in analysis, false);
  assert.deepEqual(analysis.topPosts, []);
});
test("Listening disclaimer is optional and can be cleared", () => {
  assert.equal(listeningDisclaimerSchema.parse("  "), "");
  assert.equal(listeningDisclaimerSchema.parse("  Suggestions are indicative only.  "), "Suggestions are indicative only.");
});
test("A profile placeholder is not top content, while real posts remain", () => {
  const analysis = listeningAnalysisSchema.parse({ topPosts: [
    { url: "https://www.instagram.com/thechats", views: 0, likes: 0, commentsCount: 0 },
    { url: "https://www.instagram.com/p/Dcui57kNfIQ/", views: 0, likes: 12, commentsCount: 3 },
  ] });
  assert.deepEqual(analysis.topPosts.map((post) => post.url), ["https://www.instagram.com/p/Dcui57kNfIQ/"]);
});
test("Listening content links identify posts rather than social profiles", () => {
  assert.equal(isListeningContentUrl("https://www.tiktok.com/@thechats"), false);
  assert.equal(isListeningContentUrl("https://www.tiktok.com/@thechats/video/123456789"), true);
  assert.equal(isListeningContentUrl("https://www.youtube.com/@thechats"), false);
  assert.equal(isListeningContentUrl("https://www.youtube.com/watch?v=example"), true);
  assert.equal(isListeningContentUrl("https://www.instagram.com/reel/Dcui57kNfIQ/"), true);
  assert.equal(isListeningContentUrl("https://instagram.com.evil.test/p/123"), false);
});