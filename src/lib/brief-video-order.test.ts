import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canReorderBriefVideos, reorderBriefVideos } from "./brief-video-order";

test("Playback choices move with their videos when reordered", () => {
  const result = reorderBriefVideos({ video1: "first", video1_inline: "true", video2: "second", video2_inline: "false" }, 2, 1);
  assert.equal(result['video1_inline'], "false");
  assert.equal(result['video2_inline'], "true");
});

test("Brief video dragging is available only with at least two video entries", () => {
  assert.equal(canReorderBriefVideos({ video1: "first", video2: " " }), false);
  assert.equal(canReorderBriefVideos({ video1: "first", video3: "third" }), true);
});

test("Reordering moves video links and their covers together without losing other fields", () => {
  const result = reorderBriefVideos({ video1: "first", video1_cover: "cover1", video2: "second", video2_cover: "cover2", video3: "third", video3_cover: "cover3", heading: "Inspo" }, 3, 1);
  assert.equal(result['video1'], "third");
  assert.equal(result['video1_cover'], "cover3");
  assert.equal(result['video2'], "first");
  assert.equal(result['video2_cover'], "cover1");
  assert.equal(result['video3'], "second");
  assert.equal(result['video3_cover'], "cover2");
  assert.equal(result['heading'], "Inspo");
});

test("Dragging downward preserves empty slots and all video pairs", () => {
  const result = reorderBriefVideos({ video1: "first", video1_cover: "cover1", video2: "", video3: "third", video3_cover: "cover3", video4: "fourth" }, 1, 4);
  assert.equal(result['video1'], "");
  assert.equal(result['video2'], "third");
  assert.equal(result['video2_cover'], "cover3");
  assert.equal(result['video3'], "fourth");
  assert.equal(result['video4'], "first");
  assert.equal(result['video4_cover'], "cover1");
});