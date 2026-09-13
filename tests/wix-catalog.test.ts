import assert from "node:assert/strict";
import test from "node:test";
import { mergeWixCatalogProducts, type WixCatalogOverride } from "../lib/wix-catalog";
import type { Product } from "../lib/types";

const product: Product = {
  id: "local-product",
  loyverseVariantId: "sku-1",
  slug: "local-product",
  brand: "Original Brand",
  name: "Original Name",
  concentration: "EDP",
  size: "100 ml",
  price: 10,
  description: "Original description",
  audience: "Unisex",
  family: "Woody",
  notes: { top: [], heart: [], base: [] },
  image: "/original.webp",
  imageAlt: "Original product",
  stock: 4,
};

function override(input: Partial<WixCatalogOverride> = {}): WixCatalogOverride {
  return {
    productId: "wix-product",
    variantId: "wix-variant",
    name: "Managed Name",
    brand: "Managed Brand",
    description: "Managed description",
    image: "https://static.wixstatic.com/media/product.webp",
    imageAlt: "Managed product",
    price: 25,
    inStock: true,
    ...input,
  };
}

test("Wix management overrides mutable commerce fields while preserving editorial classification", () => {
  const [managed] = mergeWixCatalogProducts([product], new Map([["sku-1", override()]]));
  assert.equal(managed.wixProductId, "wix-product");
  assert.equal(managed.wixVariantId, "wix-variant");
  assert.equal(managed.brand, "Managed Brand");
  assert.equal(managed.name, "Managed Name");
  assert.equal(managed.price, 25);
  assert.equal(managed.stock, 999999);
  assert.equal(managed.family, "Woody");
  assert.equal(managed.slug, "local-product");
});

test("Wix-hidden, out-of-stock, and unmapped products are not offered", () => {
  assert.deepEqual(mergeWixCatalogProducts([product], new Map()), []);
  assert.deepEqual(mergeWixCatalogProducts([product], new Map([["sku-1", override({ inStock: false })]])), []);
});

test("a generic Wix brand does not erase a normalized catalogue house", () => {
  const normalized = { ...product, brand: "Dior", name: "Sauvage" };
  const [managed] = mergeWixCatalogProducts([normalized], new Map([["sku-1", override({
    brand: "Aurum Privée Edit",
    name: "Christian Dior- Sauvage EDP 6.8 oz",
  })]]));
  assert.equal(managed.brand, "Dior");
  assert.equal(managed.name, "Sauvage");
});
