import assert from "node:assert/strict";
import test from "node:test";
import { catalogBrands, matchesCatalogBrand } from "@/lib/catalog-brands";

test("brand facets consolidate source aliases and exclude unresolved supplier labels", () => {
  const brands = ["Tom Ford", "Christian Dior", "Dior", "GUCCI", "Gucci", "Lataffa", "Lattafa", "Ocean", "Aurum Privée Edit"];
  assert.deepEqual(catalogBrands(brands.map((brand) => ({ brand }))), ["Dior", "Gucci", "Lattafa", "Tom Ford"]);
});

test("brand filtering matches an entire canonical brand, not a substring", () => {
  assert.ok(matchesCatalogBrand({ brand: "Christian Dior" }, "dior"));
  assert.ok(matchesCatalogBrand({ brand: "Mont Blanc" }, "Montblanc"));
  assert.ok(matchesCatalogBrand({ brand: "Tom Ford" }, ""));
  assert.ok(!matchesCatalogBrand({ brand: "Tom Ford" }, "Tom"));
  assert.ok(!matchesCatalogBrand({ brand: "Dior" }, "Miss Dior"));
});
