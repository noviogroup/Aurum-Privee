import { wixCatalogReferenceForSku } from "@/lib/wix-catalog-map";

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

export class WixCatalogMappingError extends Error {
  name = "WixCatalogMappingError";
}

export function buildWixCatalogLineItems(lines: Array<{ sku: string; quantity: number }>) {
  return lines.map(({ sku, quantity }) => {
    const reference = wixCatalogReferenceForSku(sku);
    if (!reference) throw new WixCatalogMappingError(`No Wix catalog mapping exists for SKU ${sku}`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error(`Invalid Wix checkout quantity for SKU ${sku}`);
    }
    return {
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: reference.productId,
        options: { variantId: reference.variantId },
      },
      quantity,
    };
  });
}

export function buildWixCheckoutCallbacks(storefrontOrigin: string) {
  const origin = new URL(storefrontOrigin);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Wix checkout requires a canonical HTTPS storefront origin");
  }
  return {
    thankYouPageUrl: new URL("/order/success?provider=wix", origin).toString(),
    postFlowUrl: new URL("/checkout?cancelled=1", origin).toString(),
  };
}
