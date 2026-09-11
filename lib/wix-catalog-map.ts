import catalogMap from "@/data/wix-catalog-map.json";

export type WixCatalogReference = {
  productId: string;
  variantId: string;
};

const references = catalogMap as Record<string, WixCatalogReference>;

export function wixCatalogReferenceForSku(sku: string | undefined) {
  if (!sku) return null;
  const reference = references[sku];
  if (!reference?.productId || !reference.variantId) return null;
  return reference;
}

export function wixCatalogMappingCount() {
  return Object.keys(references).length;
}
