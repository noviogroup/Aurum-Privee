import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLocalCatalogProduct } from "../lib/local-catalog-product";
import { applyProductRetailCorrection, PRODUCT_RETAIL_CORRECTIONS } from "../lib/product-retail-corrections";
import type { Product } from "../lib/types";

function product(id: string, name: string): Product {
  return {
    id,
    slug: `product-${id}`,
    brand: "Aurum Privée Edit",
    name,
    concentration: "EDP",
    size: "Standard size",
    price: 100,
    description: "Selected by Aurum Privée.",
    family: "Woody",
    notes: { top: [], heart: [], base: [] },
    image: "/product.webp",
    imageAlt: `${name} product image`,
    stock: 1,
  };
}

test("verified corrections preserve numbered names and decimal fragrance sizes", () => {
  const baccarat = normalizeLocalCatalogProduct(product(
    "a5076e9f-f3b7-477a-b32d-154aba74f514",
    "Baccarat Rouge 540 EDP 2.4 540",
  ));
  assert.equal(baccarat.brand, "Maison Francis Kurkdjian");
  assert.equal(baccarat.name, "Baccarat Rouge 540");
  assert.equal(baccarat.concentration, "Extrait de Parfum");
  assert.equal(baccarat.size, "2.4 oz");

  const phantom = normalizeLocalCatalogProduct(product(
    "ce91b419-57c8-4d0e-91ad-1eac9a6c6fec",
    "Paco Robanne Phantom Men 17 EDT SP",
  ));
  assert.equal(phantom.brand, "Paco Rabanne");
  assert.equal(phantom.name, "Phantom");
  assert.equal(phantom.concentration, "Eau de Toilette");
  assert.equal(phantom.size, "1.7 oz");
});

test("the reviewed 3.4 oz Phantom edition uses the established house spelling", () => {
  const corrected = applyProductRetailCorrection(product(
    "22858c43-33e7-461f-bf0f-6a247e500594",
    "Paco Rabbane Men's Phantom EDT Spray 3.4 oz",
  ));
  assert.equal(corrected.brand, "Paco Rabanne");
  assert.equal(corrected.name, "Phantom");
  assert.equal(corrected.size, "3.4 oz");
});

test("every retail correction records review evidence", () => {
  for (const correction of Object.values(PRODUCT_RETAIL_CORRECTIONS)) {
    assert.ok(correction.evidence.trim());
  }
});

test("reviewed catalogue names and the Addict edition photograph stay consistent", () => {
  const cases = [
    ["60cf643c-e57f-4510-94a1-744b03fb2f2e", "J’adore"],
    ["3a691c08-e61c-4921-99d4-74dd5aab7544", "Addict"],
    ["9a389809-ba1f-4809-b390-0c92b3626d1c", "Noir Extreme"],
    ["baa50a74-6f02-4161-b435-d29b7c5d81d1", "Oud Wood"],
  ];
  for (const [id, name] of cases) {
    const original = product(id, "Imported source title");
    const corrected = normalizeLocalCatalogProduct(original);
    assert.equal(corrected.name, name);
    assert.equal(corrected.slug, original.slug);
    assert.equal(corrected.id, original.id);
  }
  const addict = applyProductRetailCorrection(product(cases[1][0], "Addict Christian"));
  assert.equal(addict.concentration, "Eau de Toilette");
  assert.equal(addict.image, "/product-images/catalog-v2/378416e9-c033-4eee-a712-9d70f4a6913f.webp");
});
