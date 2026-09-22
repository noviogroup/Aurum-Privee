import "server-only";

import { isConfiguredSecret } from "@/lib/env";
import { createWixAdminClient } from "@/lib/wix-admin";
import { confirmedWixOrder, wixOrderIdIsWellFormed, type WixOrderConfirmation } from "@/lib/wix-order-status";

export async function getConfirmedWixOrder(orderId: string | undefined): Promise<WixOrderConfirmation | null> {
  if (!wixOrderIdIsWellFormed(orderId)) return null;
  if (!isConfiguredSecret(process.env.WIX_API_KEY) && !isConfiguredSecret(process.env.WIX_CLIENT_SECRET)) return null;
  try {
    const order = await createWixAdminClient().orders.getOrder(orderId!);
    return confirmedWixOrder({
      requestedId: orderId!,
      orderId: order._id,
      orderNumber: order.number,
      status: order.status,
    });
  } catch (error) {
    console.error("Wix order confirmation could not be verified", error);
    return null;
  }
}
