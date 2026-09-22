import assert from "node:assert/strict";
import test from "node:test";
import { toPublicCatalog, toPublicProduct } from "@/lib/public-product";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "product-1", slug: "golden-oud", brand: "Aurum", name: "Golden Oud", concentration: "EDP", size: "100ml",
  price: 145, compareAtPrice: 165, description: "A warm oud.", family: "Woody", notes: { top: ["Saffron"], heart: ["Rose"], base: ["Oud"] },
  image: "/golden-oud.webp", imageAlt: "Golden Oud", stock: 12, loyverseItemId: "item-secret", loyverseVariantId: "variant-secret",
  loyverseTaxIds: ["tax-secret"], wixProductId: "wix-product-secret", wixVariantId: "wix-variant-secret",
};

test("public catalogue products exclude commercial and provider fields", () => {
  const result = toPublicProduct(product) as unknown as Record<string, unknown>;
  for (const key of ["price", "compareAtPrice", "stock", "loyverseItemId", "loyverseVariantId", "loyverseTaxIds", "loyverseTaxes", "wixProductId", "wixVariantId"]) {
    assert.equal(key in result, false, `${key} must remain private`);
  }
  assert.equal(result.name, "Golden Oud");
});

test("public catalogue conversion preserves totals", () => {
  assert.deepEqual(toPublicCatalog({ products: [product], total: 8 }), { products: [toPublicProduct(product)], total: 8 });
});
