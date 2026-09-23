import type { Product } from "@/lib/types";

type ProductRetailCorrection = Pick<Product, "brand" | "name" | "concentration" | "size" | "imageAlt"> & {
  evidence: string;
  image?: string;
};

// Explicit source corrections are safer than broad numeric heuristics for a
// catalogue that includes both fluid-ounce sizes and numbered fragrance names.
export const PRODUCT_RETAIL_CORRECTIONS = {
  "60cf643c-e57f-4510-94a1-744b03fb2f2e": {
    "brand": "Dior",
    "name": "J’adore",
    "concentration": "Eau de Parfum",
    "size": "3.4 oz",
    "imageAlt": "Dior J’adore Eau de Parfum 3.4 oz product image",
    "evidence": "Controlled source item: Christian Dior- Jadore EDP 3.4. Display-name cleanup only; source edition and size preserved."
},
  "3a691c08-e61c-4921-99d4-74dd5aab7544": {
    "brand": "Dior",
    "name": "Addict",
    "image": "/product-images/catalog-v2/378416e9-c033-4eee-a712-9d70f4a6913f.webp",
    "concentration": "Eau de Toilette",
    "size": "3.4 oz",
    "imageAlt": "Dior Addict Eau de Toilette 3.4 oz product image",
    "evidence": "Controlled source item: Dior- Addict Christian EDT 3.4 oz. Reuse the existing matching Addict 3.4 oz EDT photograph (378416e9); the previous image explicitly showed Eau Fraiche."
},
  "9a389809-ba1f-4809-b390-0c92b3626d1c": {
    "brand": "Tom Ford",
    "name": "Noir Extreme",
    "concentration": "Eau de Parfum",
    "size": "1.7 oz",
    "imageAlt": "Tom Ford Noir Extreme Eau de Parfum 1.7 oz product image",
    "evidence": "Controlled source item: Tom Ford Noir Extreme by EDP Spray 1.7 oz. Display-name cleanup only; source edition and size preserved."
},
  "baa50a74-6f02-4161-b435-d29b7c5d81d1": {
    "brand": "Tom Ford",
    "name": "Oud Wood",
    "concentration": "Eau de Parfum",
    "size": "1.7 oz",
    "imageAlt": "Tom Ford Oud Wood Eau de Parfum 1.7 oz product image",
    "evidence": "Controlled source item: Tom Ford Unisex Oud Wood EDP Spray 1.7 oz. Display-name cleanup only; source edition and size preserved."
},

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
  const correction: ProductRetailCorrection | undefined = PRODUCT_RETAIL_CORRECTIONS[product.id as keyof typeof PRODUCT_RETAIL_CORRECTIONS];
  if (!correction) return product;
  return {
    ...product,
    brand: correction.brand,
    name: correction.name,
    concentration: correction.concentration,
    size: correction.size,
    imageAlt: correction.imageAlt,
    ...(correction.image ? { image: correction.image } : {}),
  };
}
