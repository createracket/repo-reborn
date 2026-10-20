import { test } from "node:test";
import { strict as assert } from "node:assert";
import { listeningEnabled, listeningAnalysisSchema, listeningDisclaimerSchema } from "./campaign-listening";
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