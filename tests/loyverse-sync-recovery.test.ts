import assert from "node:assert/strict";
import test from "node:test";
import { isLoyverseSyncEligible, isLoyverseSyncExhausted, isLoyverseSyncStuck } from "../lib/loyverse-sync-recovery";

const now = new Date("2026-08-12T12:00:00.000Z");

test("pending and failed Loyverse work remains retryable below the attempt limit", () => {
  assert.equal(isLoyverseSyncEligible({ status: "pending", attempts: 0, claimedAt: null }, now), true);
  assert.equal(isLoyverseSyncEligible({ status: "failed", attempts: 7, claimedAt: null }, now), true);
});

test("only stale processing claims are recoverable", () => {
  assert.equal(isLoyverseSyncEligible({ status: "processing", attempts: 1, claimedAt: "2026-08-12T11:50:00.000Z" }, now), false);
  assert.equal(isLoyverseSyncEligible({ status: "processing", attempts: 1, claimedAt: "2026-08-12T11:44:59.000Z" }, now), true);
  assert.equal(isLoyverseSyncStuck({ status: "processing", attempts: 1, claimedAt: null }, now), true);
});

test("the eighth attempt is terminal and visible as exhausted", () => {
  const candidate = { status: "failed", attempts: 8, claimedAt: null };
  assert.equal(isLoyverseSyncEligible(candidate, now), false);
  assert.equal(isLoyverseSyncExhausted(candidate), true);
  assert.equal(isLoyverseSyncExhausted({ status: "succeeded", attempts: 8, claimedAt: null }), false);
});
