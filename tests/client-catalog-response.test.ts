import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientCatalogResponseError,
  parseClientCatalogResponse,
} from "../lib/client-catalog-response";
import type { Product } from "../lib/types";

const product: Product = {
  id: "product-1",
  slug: "golden-oud",
  brand: "Aurum",
  name: "Golden Oud",
  concentration: "EDP",
  size: "100ml",
  price: 145,
  description: "A warm, polished oud.",
  audience: "Unisex",
  family: "Woody",
  notes: { top: ["Saffron"], heart: ["Rose"], base: ["Oud"] },
  image: "/images/golden-oud.webp",
  imageAlt: "Golden Oud bottle",
  stock: 4,
};

test("catalogue responses preserve validated products and totals", () => {
  const response = { products: [product], total: 8 };
  assert.deepEqual(parseClientCatalogResponse(response), response);
});

test("catalogue responses reject missing or malformed product arrays", () => {
  assert.throws(() => parseClientCatalogResponse({ total: 0 }), ClientCatalogResponseError);
  assert.throws(() => parseClientCatalogResponse({ products: [{ ...product, price: "145" }], total: 1 }), ClientCatalogResponseError);
});

test("catalogue responses reject impossible totals", () => {
  assert.throws(() => parseClientCatalogResponse({ products: [product], total: 0 }), ClientCatalogResponseError);
  assert.throws(() => parseClientCatalogResponse({ products: [], total: 1.5 }), ClientCatalogResponseError);
});
