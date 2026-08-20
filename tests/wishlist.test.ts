import assert from "node:assert/strict";
import test from "node:test";
import { addSavedFragranceId, MAX_SAVED_FRAGRANCES, parseSavedFragranceIds } from "@/lib/wishlist";

test("saved fragrance storage fails closed for missing, malformed, and non-array values", () => {
  assert.deepEqual(parseSavedFragranceIds(null), []);
  assert.deepEqual(parseSavedFragranceIds("not-json"), []);
  assert.deepEqual(parseSavedFragranceIds('{"id":"one"}'), []);
});

test("saved fragrance storage deduplicates, validates, and caps IDs", () => {
  const ids = Array.from({ length: MAX_SAVED_FRAGRANCES + 5 }, (_, index) => `item-${index}`);
  const result = parseSavedFragranceIds(JSON.stringify([ids[0], ids[0], 42, "", "x".repeat(121), ...ids.slice(1)]));
  assert.equal(result.length, MAX_SAVED_FRAGRANCES);
  assert.equal(new Set(result).size, result.length);
  assert.equal(result.every((id) => typeof id === "string" && id.length <= 120), true);
});

test("saved fragrance storage adds newest first without duplicates", () => {
  assert.deepEqual(addSavedFragranceId(["older"], "newer"), ["newer", "older"]);
  assert.deepEqual(addSavedFragranceId(["older"], "older"), ["older"]);
});
