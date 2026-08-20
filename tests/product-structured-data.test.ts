import assert from "node:assert/strict";
import test from "node:test";
import { productStructuredData, serializeStructuredData } from "@/lib/product-structured-data";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "variant-1",
  loyverseVariantId: "loyverse-variant-1",
  slug: "rose-at-dusk",
  brand: "Maison Test",
  name: "Rose at Dusk",
  concentration: "EDP",
  size: "50 ml",
  price: 125,
  description: "A polished rose fragrance with woods and amber.",
  family: "Floral",
  notes: { top: ["Bergamot"], heart: ["Rose"], base: ["Amber"] },
  image: "/images/rose.webp",
  imageAlt: "Rose at Dusk bottle",
  stock: 3,
};

test("product schema publishes current catalog truth", () => {
  const schema = productStructuredData(product);
  assert.equal(schema["@type"], "Product");
  assert.equal(schema.sku, "loyverse-variant-1");
  assert.equal(schema.offers.price, "125.00");
  assert.equal(schema.offers.priceCurrency, "BSD");
  assert.equal(schema.offers.availability, "https://schema.org/InStock");
});

test("structured data serialization cannot terminate its script element", () => {
  assert.equal(serializeStructuredData({ value: "</script>" }).includes("</script>"), false);
});
