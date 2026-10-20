import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { erByLikesAndComments } from "./report-engagement";

describe("non-video engagement", () => {
  test("uses only likes and comments divided by followers", () => {
    assert.equal(erByLikesAndComments({ likes: 90, comments: 10, followers: 1000 }), 10);
  });
  test("includes co-poster social followers", () => {
    assert.equal(erByLikesAndComments({ likes: 90, comments: 10, followers: 1000, coFollowers: 1000 }), 5);
  });
  test("requires followers and available engagement counts", () => {
    assert.equal(erByLikesAndComments({ likes: 90, comments: 10, followers: 0 }), null);
    assert.equal(erByLikesAndComments({ likes: null, comments: null, followers: 1000 }), null);
    assert.equal(erByLikesAndComments({ likes: 0, comments: 0, followers: 1000 }), 0);
  });
});