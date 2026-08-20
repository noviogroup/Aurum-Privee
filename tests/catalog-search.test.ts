import assert from "node:assert/strict";
import test from "node:test";
import { matchesCatalogSearch } from "@/lib/catalog-search";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "dunhill-red",
  slug: "dunhill-red",
  brand: "Alfred Dunhill",
  name: "Dunhill Desire Red 3.3 EDT SP",
  concentration: "EDT",
  size: "3.3 oz",
  price: 65,
  description: "Selected by Aurum Privée.",
  family: "Woody",
  notes: { top: [], heart: [], base: [] },
  image: "/product.webp",
  imageAlt: "Dunhill Desire Red",
  stock: 1,
};

test("catalog search matches every query word across product attributes", () => {
  assert.equal(matchesCatalogSearch(product, "dunhill red"), true);
  assert.equal(matchesCatalogSearch(product, "desire edt"), true);
  assert.equal(matchesCatalogSearch(product, "wood 3.3"), true);
});

test("short words do not match inside unrelated words", () => {
  assert.equal(matchesCatalogSearch({ ...product, name: "Desire Blue" }, "red"), false);
});

test("generic merchandising descriptions are not searchable product truth", () => {
  assert.equal(matchesCatalogSearch(product, "selected"), false);
});
