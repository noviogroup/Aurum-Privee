import "server-only";

import { createWixVisitorClient } from "@/lib/wix-visitor";
import { wixCatalogReferenceForSku } from "@/lib/wix-catalog-map";
import type { Product } from "@/lib/types";

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

export class WixCatalogMappingError extends Error {
  name = "WixCatalogMappingError";
}

export async function createWixCheckoutRedirect(
  lines: Array<{ product: Product; quantity: number }>,
  storefrontOrigin: string,
) {
  const lineItems = lines.map(({ product, quantity }) => {
    const sku = product.loyverseVariantId || product.id;
    const reference = wixCatalogReferenceForSku(sku);
    if (!reference) throw new WixCatalogMappingError(`No Wix catalog mapping exists for SKU ${sku}`);
    return {
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: reference.productId,
        options: { variantId: reference.variantId },
      },
      quantity,
    };
  });

  const client = createWixVisitorClient();
  const { cart } = await client.cart.addToCurrentCart({ lineItems });
  if (!cart?._id) throw new Error("Wix did not create a checkout cart");
  const { checkoutId } = await client.cart.createCheckoutFromCurrentCart({ channelType: "WEB" });
  if (!checkoutId) throw new Error("Wix did not create a checkout from the cart");

  const origin = storefrontOrigin.replace(/\/$/, "");
  const result = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: {
      thankYouPageUrl: `${origin}/order/success?provider=wix`,
      postFlowUrl: `${origin}/checkout?cancelled=1`,
    },
  });
  const url = result.redirectSession?.fullUrl;
  if (!url) throw new Error("Wix did not return a hosted checkout URL");
  return url;
}
