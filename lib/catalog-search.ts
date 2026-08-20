import type { Product } from "@/lib/types";

function searchableWords(product: Product) {
  return [product.name, product.brand, product.family, product.concentration, product.size, ...product.notes.top, ...product.notes.heart, ...product.notes.base]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchesCatalogSearch(product: Product, query: string) {
  const words = searchableWords(product);
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 8);
  return tokens.every((token) => words.some((word) => word.startsWith(token)));
}
