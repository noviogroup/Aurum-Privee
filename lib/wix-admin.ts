import "server-only";

import { checkout, orders, orderTransactions } from "@wix/ecom";
import { inventoryItemsV3, productsV3, storesLocationsV3 } from "@wix/stores";
import { ApiKeyStrategy, AppStrategy, createClient } from "@wix/sdk";
import { isConfiguredSecret } from "@/lib/env";

export function createWixAdminClient() {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;

  const auth = isConfiguredSecret(apiKey) && isConfiguredSecret(siteId)
    ? ApiKeyStrategy({ apiKey, siteId })
    : isConfiguredSecret(clientId) && isConfiguredSecret(clientSecret)
      ? AppStrategy({ appId: clientId, appSecret: clientSecret })
      : null;

  if (!auth) throw new Error("Wix administrative authentication is not configured");

  return createClient({
    auth,
    modules: {
      products: productsV3,
      inventory: inventoryItemsV3,
      storeLocations: storesLocationsV3,
      checkout,
      orders,
      orderTransactions,
    },
  });
}

export async function wixOrderApiIsReachable() {
  try {
    await createWixAdminClient().orders.searchOrders({ cursorPaging: { limit: 1 } });
    return true;
  } catch {
    return false;
  }
}
