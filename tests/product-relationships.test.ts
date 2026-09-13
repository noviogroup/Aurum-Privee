import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { rankRelatedProducts } from "@/lib/product-relationships";
import type { Product } from "@/lib/types";

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    brand: "Test House",
    name: `Fragrance ${id}`,
    concentration: "Eau de Parfum",
    size: "3.4 oz",
    price: 100,
    description: "A unisex fragrance.",
    audience: "Unisex",
    family: "Woody",
    notes: { top: [], heart: [], base: [] },
    image: "/test.webp",
    imageAlt: "Test product",
    stock: 1,
    ...overrides,
  };
}

test("ranks explainable matches from the available product signals", () => {
  const current = product("current", { brand: "Dior", name: "Sauvage", family: "Fresh", notes: { top: ["Bergamot"], heart: [], base: ["Vanilla"] } });
  const noteMatch = product("notes", { brand: "Afnan", family: "Fresh", notes: { top: ["Bergamot"], heart: [], base: ["Vanilla"] } });
  const generic = product("generic", { brand: "Other", family: "Floral", audience: "Women", price: 300 });

  const relationships = rankRelatedProducts(current, [current, generic, noteMatch], 2);
  assert.equal(relationships[0].product.id, "notes");
  assert.deepEqual(relationships[0].sharedNotes, ["Bergamot", "Vanilla"]);
  assert.match(relationships[0].primaryReason, /Shared Bergamot and Vanilla notes/);
  assert.ok(relationships[0].signals.includes("same-family"));
});

test("never recommends the current product or one of its reviewed sibling editions", () => {
  const current = product("bb4bf3b6-a6cd-4bba-939d-3ceafbefad16", { brand: "Dior", name: "Sauvage" });
  const sibling = product("460426e4-f854-40f4-9217-7fac41fe75bf", { brand: "Dior", name: "Sauvage" });
  const eauSauvage = product("86695d68-6d5f-46ee-a6ff-13aeaaba72f9", { brand: "Dior", name: "Eau Sauvage" });

  const relationships = rankRelatedProducts(current, [current, sibling, eauSauvage]);
  assert.deepEqual(relationships.map((item) => item.product.id), [eauSauvage.id]);
});

test("collapses a candidate variant family to its strongest matching edition", () => {
  const current = product("current", { price: 100 });
  const weekendLarge = product("005801d4-6ff6-47ef-b41e-ddc50856c838", { brand: "Burberry", name: "Weekend", price: 180 });
  const weekendClose = product("092c8ab2-a9bd-4391-9bcb-377b560dc518", { brand: "Burberry", name: "Weekend", price: 105 });
  const relationships = rankRelatedProducts(current, [current, weekendLarge, weekendClose]);

  assert.equal(relationships.length, 1);
  assert.equal(relationships[0].product.id, weekendClose.id);
});

test("ranking is deterministic when catalogue input order changes", () => {
  const current = product("current");
  const candidates = [product("charlie"), product("alpha"), product("bravo"), product("delta")];
  const forward = rankRelatedProducts(current, [current, ...candidates]).map((item) => item.product.id);
  const reverse = rankRelatedProducts(current, [current, ...candidates].reverse()).map((item) => item.product.id);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward, ["alpha", "bravo", "charlie", "delta"]);
});

test("generated relationship register covers every controlled Wix SKU", async () => {
  const root = process.cwd();
  const products = JSON.parse(await readFile(path.join(root, "data", "loyverse-products.json"), "utf8")) as Product[];
  const register = JSON.parse(await readFile(path.join(root, "data", "product-relationships.json"), "utf8")) as {
    summary: { skuCount: number; wixMappedSkuCount: number; recommendationsPerSku: number };
    products: Array<{ id: string; wixProductId: string; wixVariantId: string; related: unknown[] }>;
  };

  assert.equal(register.summary.skuCount, products.length);
  assert.equal(register.summary.wixMappedSkuCount, products.length);
  assert.equal(register.summary.recommendationsPerSku, 4);
  assert.equal(register.products.length, products.length);
  assert.ok(register.products.every((item) => item.wixProductId && item.wixVariantId && item.related.length === 4));
  assert.deepEqual(new Set(register.products.map((item) => item.id)), new Set(products.map((item) => item.id)));
});
