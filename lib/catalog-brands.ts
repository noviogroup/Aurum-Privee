import { BRAND_EDIT, customerFacingBrand } from "@/lib/brand";

// These imported labels need supplier verification before being advertised as
// fragrance houses. Their products remain searchable in the full catalogue.
const unverifiedBrandLabels = new Set([
  BRAND_EDIT, "A Thousand Wishes", "Acqua Di Gio", "Armad", "BBW",
  "Chanel Allure", "Club de Nuit", "Ferrari Black Refill Hard Case",
  "Forever Elizabeth", "Hollister Canyon", "Hugo Boss Boss Man",
  "Katy Perry Meow!", "Marc Jacobs Daisy Dream", "Mont Blanc Explorer",
  "Mont Blanc Legend Night", "Nautica Men’s", "Ocean",
  "Paco Rabanne- Pure XS by for Women",
  "Parfums De Marly- Meliora by Parfums de Marly", "Paris Hilton Gold Rush",
  "Perry Ellis-360 Collection by for Men", "Ralph Lauren Polo",
  "Sofia Vergara Tempting Fragrance Mist", "Ted Lapidus Fantasme", "Wallflowers",
].map((brand) => brand.toLowerCase()));

export function matchesCatalogBrand(product: { brand: string }, brand: string) {
  return !brand.trim() || customerFacingBrand(product.brand).toLowerCase() === customerFacingBrand(brand).toLowerCase();
}

export function catalogBrands(products: readonly { brand: string }[]): string[] {
  const brands = new Map<string, string>();
  for (const product of products) {
    const brand = customerFacingBrand(product.brand);
    const key = brand.toLowerCase();
    if (!unverifiedBrandLabels.has(key) && !brands.has(key)) brands.set(key, brand);
  }
  return [...brands.values()].sort((left, right) => left.localeCompare(right));
}
