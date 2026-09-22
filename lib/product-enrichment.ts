import type { Product } from "@/lib/types";

type ProductEnrichment = Partial<Pick<Product, "description" | "family" | "notes">> & {
  detailsSource?: Product["detailsSource"];
  image?: Product["image"];
  imageAlt?: Product["imageAlt"];
};

const sauvageEauDeParfumEnrichment: ProductEnrichment = {
    description: "Sauvage Eau de Parfum pairs the bright, spicy character of Calabrian bergamot with woody patchouli and a warm, subtly smoky vanilla absolute accord.",
    family: "Fresh",
    notes: {
      top: ["Calabrian Bergamot", "Woody Patchouli", "Vanilla Absolute"],
      heart: [],
      base: [],
    },
    detailsSource: {
      label: "Dior",
      url: "https://www.dior.com/en_us/beauty/products/sauvage-eau-de-parfum-F078524009.html",
    },
    image: "/images/hero-products/dior-sauvage.webp",
    imageAlt: "Dior Sauvage Eau de Parfum bottle and presentation box",
};

const productEnrichment: Record<string, ProductEnrichment> = {
  "christian-dior-sauvage-edp-6-8-oz-bb4bf3": sauvageEauDeParfumEnrichment,
  "christian-dior-dior-sauvage-3-4-edp-sp-460426": sauvageEauDeParfumEnrichment,
  "dior-sauvage-2-0-oz-edp-sp-7b0277": sauvageEauDeParfumEnrichment,
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
