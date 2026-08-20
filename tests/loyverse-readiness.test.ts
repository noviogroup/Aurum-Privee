import assert from "node:assert/strict";
import test from "node:test";
import { deliveryItemRequirement, expectedLoyverseBusinessName, loyverseBusinessNameMatches } from "../lib/loyverse-readiness";

test("Loyverse readiness defaults to the approved Aurum Privée brand", () => {
  assert.equal(expectedLoyverseBusinessName({}), "Aurum Privée");
  assert.equal(loyverseBusinessNameMatches(" aurum  privée ", "Aurum Privée"), true);
  assert.equal(loyverseBusinessNameMatches("Iola Lily", "Aurum Privée"), false);
});

test("delivery readiness tells an operator exactly what must be created", () => {
  assert.match(deliveryItemRequirement(), /fixed-price, non-stock/);
  assert.match(deliveryItemRequirement(), /variant ID/);
});
