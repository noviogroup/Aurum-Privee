import { media } from "@wix/sdk";
import { unstable_cache } from "next/cache";
import { BRAND_EDIT, customerFacingBrand, customerFacingCopy, customerFacingProductName } from "@/lib/brand";
import type { Product } from "@/lib/types";
import { applyProductRetailCorrection } from "@/lib/product-retail-corrections";
import { applyProductEnrichment } from "@/lib/product-enrichment";
import { wixCatalogReferenceForSku } from "@/lib/wix-catalog-map";
import { createWixVisitorClient } from "@/lib/wix-visitor";

export type WixCatalogOverride = {
  productId: string;
  variantId: string;
  name: string;
  brand?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  price: number;
  inStock: boolean;
};

type CacheEntry = {
  expiresAt: number;
  value: Promise<Map<string, WixCatalogOverride>>;
};

let catalogCache: CacheEntry | null = null;

export async function retryWixCatalogFetch<T>(
  request: () => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 2,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await wait(250 * (attempt + 1));
    }
  }
  throw lastError;
}

function wixImageUrl(identifier: string | null | undefined) {
  if (!identifier) return undefined;
  if (identifier.startsWith("https://")) return identifier;
  try {
    return media.getImageUrl(identifier).url;
  } catch {
    return undefined;
  }
}

async function fetchWixCatalogOverrides() {
  const client = createWixVisitorClient();
  let variantPage = await client.variants.queryVariants().limit(1000).find();
  const variants = [...variantPage.items];
  while (variantPage.hasNext()) {
    variantPage = await variantPage.next();
    variants.push(...variantPage.items);
  }

  const overrides = new Map<string, WixCatalogOverride>();

  for (const variant of variants) {
    const sku = variant.sku?.trim();
    const productId = variant.productData?.productId;
    const variantId = variant.variantId;
    if (!sku || !productId || !variantId) continue;
    const mapped = wixCatalogReferenceForSku(sku);
    if (!mapped) continue;
    if (mapped.productId !== productId || mapped.variantId !== variantId) {
      throw new Error(`The Wix catalog map is stale for SKU ${sku}`);
    }
    const amount = Number(variant.price?.actualPrice?.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Wix returned an invalid price for SKU ${sku}`);
    const imageIdentifier = variant.media?.image;
    overrides.set(sku, {
      productId,
      variantId,
      name: variant.productData?.name || "Fragrance",
      image: wixImageUrl(imageIdentifier),
      imageAlt: variant.media?.altText || undefined,
      price: amount,
      inStock: variant.visible !== false
        && variant.productData?.visible !== false
        && variant.inventoryStatus?.inStock !== false,
    });
  }

  return overrides;
}

export async function getWixCatalogOverrides() {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) return catalogCache.value;
  const value = retryWixCatalogFetch(fetchWixCatalogOverrides);
  catalogCache = { expiresAt: now + 60_000, value };
  try {
    return await value;
  } catch (error) {
    catalogCache = null;
    throw error;
  }
}

export async function getCacheableWixCatalogOverrideEntries(
  load: () => Promise<Map<string, WixCatalogOverride>> = getWixCatalogOverrides,
) {
  try {
    return [...(await load()).entries()] as Array<[string, WixCatalogOverride]>;
  } catch {
    // Wix SDK transport errors can contain recursively nested runtimeError/cause
    // values. Next logs background cache failures, so expose a bounded error only.
    throw new Error("Wix storefront catalogue refresh failed");
  }
}

const getCachedWixCatalogOverrideEntries = unstable_cache(
  getCacheableWixCatalogOverrideEntries,
  ["wix-storefront-catalog-v2"],
  { revalidate: 60, tags: ["wix-storefront-catalog"] },
);

export function mergeWixCatalogProducts(products: Product[], overrides: ReadonlyMap<string, WixCatalogOverride>) {
  return products.flatMap((product) => {
    const sku = product.loyverseVariantId || product.id;
    const override = overrides.get(sku);
    if (!override || !override.inStock) return [];
    const wixBrand = customerFacingBrand(override.brand || product.brand);
    const brand = wixBrand === BRAND_EDIT && product.brand !== BRAND_EDIT ? product.brand : wixBrand;
    const name = customerFacingProductName(override.name, brand);
    return [applyProductEnrichment(applyProductRetailCorrection({
      ...product,
      wixProductId: override.productId,
      wixVariantId: override.variantId,
      brand,
      name,
      description: customerFacingCopy(override.description || product.description),
      image: override.image || product.image,
      imageAlt: customerFacingCopy(override.imageAlt || product.imageAlt),
      price: override.price,
      stock: 999999,
    }))];
  });
}

export async function applyWixCatalog(products: Product[]) {
  const overrides = new Map<string, WixCatalogOverride>(await getCachedWixCatalogOverrideEntries());
  return mergeWixCatalogProducts(products, overrides);
}
