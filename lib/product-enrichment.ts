import type { Product } from "@/lib/types";

type ProductEnrichment = Pick<Product, "description" | "family" | "notes"> & {
  detailsSource?: Product["detailsSource"];
};

const productEnrichment: Record<string, ProductEnrichment> = {
  "afnan-supremecy-incense-3-4-oz-edp-sp-9e897b": {
    description: "Supremacy Incense is an Eau de Parfum by Afnan. Afnan lists bergamot, oregano and pepper as the top notes; amber, labdanum and opoponax as the middle notes; and leather, sandalwood, patchouli and oud as the base notes.",
    family: "Woody",
    notes: {
      top: ["Bergamot", "Oregano", "Pepper"],
      heart: ["Amber", "Labdanum", "Opoponax"],
      base: ["Leather", "Sandalwood", "Patchouli", "Oud"],
    },
    detailsSource: {
      label: "Afnan Perfumes",
      url: "https://afnan.com/products/supremacy-incense",
    },
  },
};

export function applyProductEnrichment(product: Product): Product {
  const enrichment = productEnrichment[product.slug];
  return enrichment ? { ...product, ...enrichment } : product;
}
