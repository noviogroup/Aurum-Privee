import assert from "node:assert/strict";
import test from "node:test";
import { curatedImageForVariant, emptyCuratedProductImageManifest, parseCuratedProductImageManifest } from "../lib/curated-product-images";

test("curated product photography is resolved by Loyverse variant", () => {
  const manifest = emptyCuratedProductImageManifest();
  manifest.images.variant = {
    variantId: "variant",
    itemId: "item",
    sku: "10001",
    barcode: "",
    productName: "Approved fragrance",
    image: "/product-images/variant.webp",
    sourceFilename: "10001.jpg",
    sourceSha256: "a".repeat(64),
    width: 1600,
    height: 1600,
    approvedAt: "2026-08-12T12:00:00.000Z",
  };
  assert.equal(curatedImageForVariant(manifest, "variant"), "/product-images/variant.webp");
  assert.equal(curatedImageForVariant(manifest, "other"), null);
});

test("invalid or externally hosted manifest entries fail closed", () => {
  const parsed = parseCuratedProductImageManifest({
    version: 1,
    updatedAt: "2026-08-12T12:00:00.000Z",
    images: {
      safe: { variantId: "safe", image: "/product-images/safe.webp", sourceSha256: "b".repeat(64) },
      unsafe: { variantId: "unsafe", image: "https://untrusted.example/image.jpg", sourceSha256: "c".repeat(64) },
    },
  });
  assert.equal(curatedImageForVariant(parsed, "safe"), "/product-images/safe.webp");
  assert.equal(curatedImageForVariant(parsed, "unsafe"), null);
});
