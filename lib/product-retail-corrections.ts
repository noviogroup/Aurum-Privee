import type { Product } from "@/lib/types";

type ProductRetailCorrection = Pick<Product, "brand" | "name" | "concentration" | "size" | "imageAlt"> & {
  evidence: string;
};

// Explicit source corrections are safer than broad numeric heuristics for a
// catalogue that includes both fluid-ounce sizes and numbered fragrance names.
export const PRODUCT_RETAIL_CORRECTIONS = {
  "a5076e9f-f3b7-477a-b32d-154aba74f514": {
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    concentration: "Extrait de Parfum",
    size: "2.4 oz",
    imageAlt: "Maison Francis Kurkdjian Baccarat Rouge 540 Extrait de Parfum 2.4 oz product image",
    evidence: "https://www.franciskurkdjian.com/us-en/landing_page_baccarat-rouge-540.html",
  },
  "ce91b419-57c8-4d0e-91ad-1eac9a6c6fec": {
    brand: "Paco Rabanne",
    name: "Phantom",
    concentration: "Eau de Toilette",
    size: "1.7 oz",
    imageAlt: "Paco Rabanne Phantom Eau de Toilette 1.7 oz product image",
    evidence: "https://www.sephora.com/product/paco-rabanne-phantom-eau-de-toilette-P475147",
  },
  "22858c43-33e7-461f-bf0f-6a247e500594": {
    brand: "Paco Rabanne",
    name: "Phantom",
    concentration: "Eau de Toilette",
    size: "3.4 oz",
    imageAlt: "Paco Rabanne Phantom Eau de Toilette 3.4 oz product image",
    evidence: "Controlled source item explicitly identifies the 3.4 oz Eau de Toilette edition.",
  },
} satisfies Record<string, ProductRetailCorrection>;

export function applyProductRetailCorrection(product: Product): Product {
  const correction = PRODUCT_RETAIL_CORRECTIONS[product.id as keyof typeof PRODUCT_RETAIL_CORRECTIONS];
  if (!correction) return product;
  return {
    ...product,
    brand: correction.brand,
    name: correction.name,
    concentration: correction.concentration,
    size: correction.size,
    imageAlt: correction.imageAlt,
  };
}
