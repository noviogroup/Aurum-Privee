import assert from "node:assert/strict";
import test from "node:test";
import { productCurationSchema, splitCurationNotes } from "@/lib/product-curation";

const valid = {
  productId: "10000000-0000-0000-0000-000000000001",
  description: "A complete fragrance description approved by Aurum Privée.",
  scentFamily: "Floral",
  notes: { top: ["Bergamot"], heart: ["Rose"], base: ["Musk"] },
  featured: true,
  newArrival: false,
  storefrontVisible: true,
  sortOrder: 100,
};

test("accepts bounded storefront curation fields", () => {
  assert.deepEqual(productCurationSchema.parse(valid), valid);
  assert.deepEqual(splitCurationNotes(" bergamot, Rose, , musk "), ["bergamot", "Rose", "musk"]);
});

test("rejects unknown, oversized and retail-truth fields", () => {
  assert.equal(productCurationSchema.safeParse({ ...valid, price: 1 }).success, false);
  assert.equal(productCurationSchema.safeParse({ ...valid, description: "Too short" }).success, false);
  assert.equal(productCurationSchema.safeParse({ ...valid, notes: { ...valid.notes, top: Array(13).fill("Note") } }).success, false);
  assert.equal(productCurationSchema.safeParse({ ...valid, sortOrder: -1 }).success, false);
});
