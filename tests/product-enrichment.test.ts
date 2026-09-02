import assert from "node:assert/strict";
import test from "node:test";
import { applyProductEnrichment } from "../lib/product-enrichment";
import type { Product } from "../lib/types";

const baseProduct: Product = {
  id: "variant-1",
  slug: "afnan-supremecy-incense-3-4-oz-edp-sp-9e897b",
  brand: "Afnan",
  name: "Supremacy Incense",
  concentration: "EDP",
  size: "3.4 oz",
  price: 75,
  description: "Generic description",
  family: "Woody",
  notes: { top: [], heart: [], base: [] },
  image: "/product.webp",
  imageAlt: "Product",
  stock: 4,
};

test("adds verified fragrance details without changing commerce data", () => {
  const enriched = applyProductEnrichment(baseProduct);

  assert.deepEqual(enriched.notes.top, ["Bergamot", "Oregano", "Pepper"]);
  assert.deepEqual(enriched.notes.base, ["Leather", "Sandalwood", "Patchouli", "Oud"]);
  assert.match(enriched.description, /Afnan lists bergamot, oregano and pepper as the top notes/);
  assert.doesNotMatch(enriched.description, /polished trail|smoky woodland/);
  assert.equal(enriched.detailsSource?.label, "Afnan Perfumes");
  assert.equal(enriched.price, 75);
  assert.equal(enriched.stock, 4);
});

test("leaves products without curated enrichment unchanged", () => {
  const untouched = { ...baseProduct, slug: "another-fragrance" };
  assert.deepEqual(applyProductEnrichment(untouched), untouched);
});
