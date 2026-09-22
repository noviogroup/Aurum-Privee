import assert from "node:assert/strict";
import test from "node:test";
import { customerFacingBrand, customerFacingConcentration, customerFacingCopy, customerFacingProductName } from "../lib/brand";

test("uses one customer-facing label for known brand aliases", () => {
  assert.equal(customerFacingBrand("Christian Dior"), "Dior");
  assert.equal(customerFacingBrand("Afnan Perfumes"), "Afnan");
  assert.equal(customerFacingBrand("Mont Blanc"), "Montblanc");
  assert.equal(customerFacingBrand("Al  Haramain"), "Al Haramain");
  assert.equal(customerFacingBrand("Jean Paul Glautier"), "Jean Paul Gaultier");
});

test("expands retail shorthand and removes imported HTML from customer copy", () => {
  assert.equal(customerFacingConcentration("EDP"), "Eau de Parfum");
  assert.equal(customerFacingConcentration("EDT"), "Eau de Toilette");
  assert.equal(customerFacingCopy("<p>Warm &amp; polished.</p>"), "Warm & polished.");
});

test("polishes obvious customer-facing fragrance name formatting", () => {
  assert.equal(customerFacingProductName("Supremecy Incense 3.40z EDP SP"), "Supremacy Incense 3.4 oz EDP SP");
  assert.equal(customerFacingProductName("Erba Pura Unisex 1.7oz EDP SP"), "Erba Pura Unisex 1.7 oz EDP SP");
  assert.equal(customerFacingProductName("Dunhill Desire 3,3 oz EDT"), "Dunhill Desire 3.3 oz EDT");
});

test("preserves legitimate product wording", () => {
  assert.equal(customerFacingProductName("Dior Sauvage 3.4 EDP SP"), "Dior Sauvage 3.4 EDP SP");
});

test("creates concise customer-facing names when brand and format are displayed separately", () => {
  assert.equal(customerFacingProductName("Dior Sauvage 3.4 EDP SP", "Christian Dior"), "Sauvage");
  assert.equal(customerFacingProductName("Christian Dior- Sauvage EDP 6.8 oz", "Dior"), "Sauvage");
  assert.equal(customerFacingProductName("Al Haramain - Azlan Oud Amber Extrait De Parfum 3.3oz", "Al Haramain"), "Azlan Oud Amber");
  assert.equal(customerFacingProductName("Azlan Oud Amber Extrait De", "Al Haramain"), "Azlan Oud Amber");
  assert.equal(customerFacingProductName("Supremecy Incense 3.4 oz EDP SP", "Afnan"), "Supremacy Incense");
});
