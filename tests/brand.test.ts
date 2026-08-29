import assert from "node:assert/strict";
import test from "node:test";
import { customerFacingProductName } from "../lib/brand";

test("polishes obvious customer-facing fragrance name formatting", () => {
  assert.equal(customerFacingProductName("Supremecy Incense 3.40z EDP SP"), "Supremacy Incense 3.4 oz EDP SP");
  assert.equal(customerFacingProductName("Erba Pura Unisex 1.7oz EDP SP"), "Erba Pura Unisex 1.7 oz EDP SP");
  assert.equal(customerFacingProductName("Dunhill Desire 3,3 oz EDT"), "Dunhill Desire 3.3 oz EDT");
});

test("preserves legitimate product wording", () => {
  assert.equal(customerFacingProductName("Dior Sauvage 3.4 EDP SP"), "Dior Sauvage 3.4 EDP SP");
});
