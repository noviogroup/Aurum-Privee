import type { PublicProduct } from "@/lib/types";

function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[’']/g, "").toLowerCase();
}

function searchableWords(product: PublicProduct) {
  return searchText([product.name, product.brand, product.family, product.concentration, product.size, ...product.notes.top, ...product.notes.heart, ...product.notes.base]
    .join(" "))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchesCatalogSearch(product: PublicProduct, query: string) {
  const words = searchableWords(product);
  const tokens = searchText(query).split(/[^a-z0-9]+/).filter(Boolean).slice(0, 8);
  return tokens.every((token) => words.some((word) => word.startsWith(token)));
}
