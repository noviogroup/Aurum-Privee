import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import productsJson from "../data/loyverse-products.json";
import catalogMapJson from "../data/wix-catalog-map.json";
import { normalizeLocalCatalogProducts } from "../lib/local-catalog-product";
import type { Product } from "../lib/types";

type WixCatalogReference = { productId: string; variantId: string };

const products = productsJson as Product[];
const normalizedProducts = normalizeLocalCatalogProducts(products);
const catalogMap = catalogMapJson as Record<string, WixCatalogReference>;
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("approved catalog snapshot and Wix map remain complete and storefront-safe", () => {
  assert.equal(products.length, 733);
  assert.equal(Object.keys(catalogMap).length, 733);

  const ids = new Set<string>();
  const slugs = new Set<string>();
  const skus = new Set<string>();
  for (const product of products) {
    assert.ok(!ids.has(product.id), `Duplicate product id: ${product.id}`);
    assert.ok(!slugs.has(product.slug), `Duplicate product slug: ${product.slug}`);
    ids.add(product.id);
    slugs.add(product.slug);

    const sku = product.loyverseVariantId || product.id;
    assert.ok(!skus.has(sku), `Duplicate catalog SKU: ${sku}`);
    skus.add(sku);

    assert.match(product.id, guid, `Invalid product id: ${product.id}`);
    assert.match(product.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Unsafe product slug: ${product.slug}`);
    assert.ok(product.brand.trim(), `Missing brand: ${product.id}`);
    assert.ok(product.name.trim(), `Missing name: ${product.id}`);
    assert.ok(product.description.trim(), `Missing description: ${product.id}`);
    assert.ok(product.imageAlt.trim(), `Missing image alt text: ${product.id}`);
    assert.ok(Number.isFinite(product.price) && product.price > 0, `Invalid price: ${product.id}`);
    assert.ok(Number.isFinite(product.stock) && product.stock >= 0, `Invalid stock: ${product.id}`);
    assert.ok(product.image.startsWith("/"), `Catalog image must use a controlled local path: ${product.id}`);
    assert.ok(existsSync(path.join(process.cwd(), "public", product.image.slice(1))), `Missing catalog image: ${product.image}`);
  }

  assert.deepEqual([...Object.keys(catalogMap)].sort(), [...skus].sort(), "Wix map and approved SKUs differ");
  const variantIds = new Set<string>();
  for (const [sku, reference] of Object.entries(catalogMap)) {
    assert.match(reference.productId, guid, `Invalid Wix product id for ${sku}`);
    assert.match(reference.variantId, guid, `Invalid Wix variant id for ${sku}`);
    assert.ok(!variantIds.has(reference.variantId), `Duplicate Wix variant id: ${reference.variantId}`);
    variantIds.add(reference.variantId);
  }
});

test("normalized fragrance sizes remain plausible", () => {
  for (const product of normalizedProducts) {
    const ounces = product.size.match(/^(\d+(?:\.\d+)?) oz$/i)?.[1];
    if (!ounces) continue;
    assert.ok(Number(ounces) <= 10, `Implausible fragrance size: ${product.id} (${product.size})`);
  }
});
