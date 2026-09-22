import "server-only";

import { createWixVisitorClient } from "@/lib/wix-visitor";
import type { Product } from "@/lib/types";
import { buildWixCatalogLineItems, buildWixCheckoutCallbacks } from "@/lib/wix-checkout-contract";

export { WixCatalogMappingError } from "@/lib/wix-checkout-contract";

export async function createWixCheckoutRedirect(
  lines: Array<{ product: Product; quantity: number }>,
  storefrontOrigin: string,
) {
  const lineItems = buildWixCatalogLineItems(lines.map(({ product, quantity }) => ({
    sku: product.loyverseVariantId || product.id,
    quantity,
  })));

  const client = createWixVisitorClient();
  const { cart } = await client.cart.addToCurrentCart({ lineItems });
  if (!cart?._id) throw new Error("Wix did not create a checkout cart");
  const { checkoutId } = await client.cart.createCheckoutFromCurrentCart({ channelType: "WEB" });
  if (!checkoutId) throw new Error("Wix did not create a checkout from the cart");

  const result = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: buildWixCheckoutCallbacks(storefrontOrigin),
  });
  const url = result.redirectSession?.fullUrl;
  if (!url) throw new Error("Wix did not return a hosted checkout URL");
  return url;
}
