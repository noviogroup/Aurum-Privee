import assert from "node:assert/strict";
import test from "node:test";
import { getCacheableWixCatalogOverrideEntries, mergeWixCatalogProducts, retryWixCatalogFetch, type WixCatalogOverride } from "../lib/wix-catalog";
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

test("a reviewed retail correction survives an outdated Wix display name", () => {
  const baccarat = {
    ...product,
    id: "a5076e9f-f3b7-477a-b32d-154aba74f514",
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    concentration: "Extrait de Parfum",
    size: "2.4 oz",
  };
  const [managed] = mergeWixCatalogProducts([baccarat], new Map([["sku-1", override({
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge",
  })]]));
  assert.equal(managed.name, "Baccarat Rouge 540");
  assert.equal(managed.concentration, "Extrait de Parfum");
  assert.equal(managed.size, "2.4 oz");
});

test("reviewed Sauvage photography survives a mismatched Wix media override", () => {
  const sauvage = {
    ...product,
    slug: "christian-dior-sauvage-edp-6-8-oz-bb4bf3",
    brand: "Dior",
    name: "Sauvage",
    concentration: "Eau de Parfum",
    size: "6.8 oz",
  };
  const [managed] = mergeWixCatalogProducts([sauvage], new Map([["sku-1", override({
    brand: "Dior",
    name: "Sauvage",
    image: "https://static.wixstatic.com/media/mismatched-parfum.webp",
    imageAlt: "Dior Sauvage Parfum product image",
  })]]));
  assert.equal(managed.image, "/images/hero-products/dior-sauvage.webp");
  assert.equal(managed.imageAlt, "Dior Sauvage Eau de Parfum bottle and presentation box");
});

test("a transient Wix catalogue failure is retried once", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const result = await retryWixCatalogFetch(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary Wix response");
    return "catalog-ready";
  }, async (milliseconds) => { waits.push(milliseconds); });

  assert.equal(result, "catalog-ready");
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [250]);
});

test("a persistent Wix catalogue failure still fails closed", async () => {
  let attempts = 0;
  await assert.rejects(
    retryWixCatalogFetch(async () => {
      attempts += 1;
      throw new Error("Wix unavailable");
    }, async () => {}),
    /Wix unavailable/,
  );
  assert.equal(attempts, 2);
});

test("background Wix cache failures discard recursive SDK error details", async () => {
  const sdkError: { runtimeError?: unknown; cause?: unknown } = {};
  sdkError.runtimeError = sdkError;
  sdkError.cause = sdkError;

  await assert.rejects(
    getCacheableWixCatalogOverrideEntries(async () => { throw sdkError; }),
    (error: unknown) => error instanceof Error
      && error.message === "Wix storefront catalogue refresh failed"
      && error.cause === undefined,
  );
});
