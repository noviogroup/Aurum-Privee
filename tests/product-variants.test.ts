import assert from "node:assert/strict";
import test from "node:test";
import { getProductVariantFamily, getProductVariants, productVariantLabel } from "@/lib/product-variants";
import type { Product } from "@/lib/types";

function product(id: string, size: string, concentration: string): Product {
  return {
    id,
    slug: id,
    brand: "Dior",
    name: "Sauvage",
    concentration,
    size,
    price: 100,
    description: "",
    family: "Woody",
    notes: { top: [], heart: [], base: [] },
    image: "/test.webp",
    imageAlt: "",
    stock: 1,
  };
}

test("Sauvage formats share an explicit reviewed family", () => {
  const edp = product("7b027759-a2c5-43e7-bb91-93975567c14e", "2.0 oz", "Eau de Parfum");
  const edt = product("9f78f027-1c03-4b3a-b6c8-7e397c098c26", "2.0 oz", "Eau de Toilette");
  assert.equal(getProductVariantFamily(edp.id)?.key, "dior-sauvage");
  assert.deepEqual(getProductVariants(edp.id, [edt, edp]).map((item) => item.id), [edp.id, edt.id]);
  assert.equal(productVariantLabel(edp), "2.0 oz · Eau de Parfum");
});

test("Eau Sauvage is not merged into the Sauvage family", () => {
  assert.equal(getProductVariantFamily("86695d68-6d5f-46ee-a6ff-13aeaaba72f9"), undefined);
  assert.equal(getProductVariantFamily("0eddb2ea-8eee-4f79-a9e1-477c5cc4612d"), undefined);
});
