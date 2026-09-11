import assert from "node:assert/strict";
import test from "node:test";
import { buildWixCatalogCsv, WIX_CSV_COLUMNS } from "@/lib/wix-catalog-export";
import type { Product } from "@/lib/types";

const base: Product = {
  id: "one",
  slug: "one",
  brand: "Christian Dior",
  name: "Dior Sauvage 3.4 EDP SP",
  concentration: "EDP",
  size: "Standard size",
  price: 165,
  description: "Verified copy",
  family: "Fresh",
  notes: { top: [], heart: [], base: [] },
  image: "/product-images/one.webp",
  imageAlt: "Dior Sauvage bottle",
  stock: 3,
};

test("builds a Wix-compatible singleton product and media pair", () => {
  const result = buildWixCatalogCsv([base], "https://aurumprivee.com");
  const lines = result.csv.trim().split("\n");
  assert.equal(lines[0], WIX_CSV_COLUMNS.join(","));
  assert.equal(result.productCount, 1);
  assert.equal(result.variantCount, 1);
  assert.equal(lines.length, 3);
  assert.match(result.csv, /https:\/\/aurumprivee\.com\/product-images\/one\.webp/);
  assert.match(result.csv, /Dior/);
});

test("escapes descriptions with punctuation and line breaks", () => {
  const result = buildWixCatalogCsv([{ ...base, description: 'Bright, polished\nand "warm".' }], "https://aurumprivee.com");
  assert.match(result.csv, /"Bright, polished\nand ""warm""\."/);
});
