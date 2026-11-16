import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calendarBrandChannels, selectedCalendarChannels } from "./report-calendar-channels";
test("Only Jungle offers Jungle Merch and Merch Jungle calendar channels", () => {
  assert.deepEqual(calendarBrandChannels("jungle"), ["Jungle Merch", "Merch Jungle"]);
  assert.deepEqual(calendarBrandChannels("chats-socials"), []);
  assert.deepEqual(calendarBrandChannels("tixel-socials"), []);
});
test("Both brand channels can be enabled with independent thumbnails", () => {
  assert.deepEqual(selectedCalendarChannels({
    "Jungle Merch": { enabled: true, thumbnail_url: "https://example.com/jungle.jpg" },
    "Merch Jungle": { enabled: true, thumbnail_url: "https://example.com/merch.jpg" },
  }), [
    { name: "Jungle Merch", thumbnail_url: "https://example.com/jungle.jpg" },
    { name: "Merch Jungle", thumbnail_url: "https://example.com/merch.jpg" },
  ]);
});
test("Turning one channel off leaves the other channel visible", () => {
  assert.deepEqual(selectedCalendarChannels({ "Jungle Merch": { enabled: false }, "Merch Jungle": { enabled: true } }), [{ name: "Merch Jungle", thumbnail_url: null }]);
});