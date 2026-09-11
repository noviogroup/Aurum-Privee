import { media } from "@wix/sdk";
import { customerFacingBrand, customerFacingCopy, customerFacingProductName } from "@/lib/brand";
import type { Product } from "@/lib/types";
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
  let productPage = await client.products.queryProducts().limit(100).find();
  const products = [...productPage.items];
  while (productPage.hasNext()) {
    productPage = await productPage.next();
    products.push(...productPage.items);
  }

  let variantPage = await client.variants.queryVariants().limit(1000).find();
  const variants = [...variantPage.items];
  while (variantPage.hasNext()) {
    variantPage = await variantPage.next();
    variants.push(...variantPage.items);
  }

  const productById = new Map(products.flatMap((product) => product._id ? [[product._id, product] as const] : []));
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
    const wixProduct = productById.get(productId);
    const amount = Number(variant.price?.actualPrice?.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Wix returned an invalid price for SKU ${sku}`);
    const imageIdentifier = variant.media?.image || wixProduct?.media?.main?.image;
    overrides.set(sku, {
      productId,
      variantId,
      name: wixProduct?.name || variant.productData?.name || "Fragrance",
      brand: wixProduct?.brand?.name || undefined,
      description: wixProduct?.plainDescription || undefined,
      image: wixImageUrl(imageIdentifier),
      imageAlt: variant.media?.altText || wixProduct?.media?.main?.altText || undefined,
      price: amount,
      inStock: variant.inventoryStatus?.inStock !== false,
    });
  }

  return overrides;
}

export async function getWixCatalogOverrides() {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) return catalogCache.value;
  const value = fetchWixCatalogOverrides();
  catalogCache = { expiresAt: now + 60_000, value };
  try {
    return await value;
  } catch (error) {
    catalogCache = null;
    throw error;
  }
}

export function mergeWixCatalogProducts(products: Product[], overrides: ReadonlyMap<string, WixCatalogOverride>) {
  return products.flatMap((product) => {
    const sku = product.loyverseVariantId || product.id;
    const override = overrides.get(sku);
    if (!override || !override.inStock) return [];
    const brand = customerFacingBrand(override.brand || product.brand);
    const name = customerFacingProductName(override.name, brand);
    return [{
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
    }];
  });
}

export async function applyWixCatalog(products: Product[]) {
  return mergeWixCatalogProducts(products, await getWixCatalogOverrides());
}
