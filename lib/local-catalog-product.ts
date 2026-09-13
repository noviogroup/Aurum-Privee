import type { Product } from "@/lib/types";
import {
  BRAND_EDIT,
  customerFacingBrand,
  customerFacingConcentration,
  customerFacingCopy,
  customerFacingProductName,
  customerFacingSize,
} from "@/lib/brand";
import { applyProductEnrichment } from "@/lib/product-enrichment";
import { audienceForProduct } from "@/lib/product-normalization";
import { getProductVariantFamily } from "@/lib/product-variants";

function inferredBrand(product: Product, knownBrands: string[]) {
  const family = getProductVariantFamily(product.id);
  if (family) return family.brand;
  const current = customerFacingBrand(product.brand);
  if (current !== BRAND_EDIT) return current;
  const delimiterPrefix = product.name.match(/^([^-/]{2,50}?)\s*[-/]\s*/)?.[1]?.trim();
  if (delimiterPrefix && delimiterPrefix.split(/\s+/).length <= 4 && !/\d/.test(delimiterPrefix)) {
    return customerFacingBrand(delimiterPrefix);
  }
  const normalizedName = product.name.toLowerCase().replace(/\s+/g, " ").trim();
  return knownBrands.find((brand) => {
    const normalizedBrand = brand.toLowerCase();
    return normalizedName === normalizedBrand || normalizedName.startsWith(`${normalizedBrand} `);
  }) || current;
}

export function normalizeLocalCatalogProduct(product: Product, knownBrands: string[] = []): Product {
  const family = getProductVariantFamily(product.id);
  const brand = inferredBrand(product, knownBrands);
  const description = customerFacingCopy(product.description);
  return applyProductEnrichment({
    ...product,
    brand,
    name: family?.name || customerFacingProductName(product.name, brand),
    concentration: customerFacingConcentration(product.concentration),
    size: customerFacingSize(product.size, product.name),
    audience: product.audience || audienceForProduct(null, product.name, description),
    description,
    imageAlt: customerFacingCopy(product.imageAlt),
  });
}

export function normalizeLocalCatalogProducts(products: Product[]): Product[] {
  const knownBrands = [...new Set(products.map((product) => customerFacingBrand(product.brand)).filter((brand) => brand !== BRAND_EDIT))]
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  return products.map((product) => normalizeLocalCatalogProduct(product, knownBrands));
}
