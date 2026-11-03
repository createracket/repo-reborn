import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { hasNewFollowers, newFollowersEnabled, orderByNewFollowers } from "./report-new-followers";

describe("new followers", () => {
  test("only posts with an entered value count as having new followers", () => {
    assert.equal(hasNewFollowers({ new_followers: null }), false);
    assert.equal(hasNewFollowers({}), false);
    assert.equal(hasNewFollowers({ new_followers: 0 }), true);
    assert.equal(hasNewFollowers({ new_followers: 120 }), true);
  });

  test("Followers order shows only posts with entries, most new followers first", () => {
    const posts = [
      { id: "a", new_followers: 10 },
      { id: "b", new_followers: null },
      { id: "c", new_followers: 250 },
      { id: "d" },
      { id: "e", new_followers: 40 },
    ];
    assert.deepEqual(
      orderByNewFollowers(posts, (p) => p).map((p) => p.id),
      ["c", "e", "a"],
    );
  });
});

describe("new followers scope", () => {
  test("only the Tixel social report offers new followers for now", () => {
    assert.equal(newFollowersEnabled("tixel-report"), true);
    assert.equal(newFollowersEnabled("stat-socials"), false);
    assert.equal(newFollowersEnabled("chats-socials"), false);
    assert.equal(newFollowersEnabled(null), false);
  });
});
