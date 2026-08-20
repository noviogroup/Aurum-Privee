export type OperationsLineItem = {
  name: string;
  quantity: number;
  amount: number;
  image?: string;
  productId?: string;
};

export type OperationsOrder = {
  id: string;
  orderNumber: string;
  paymentStatus: string;
  fulfillmentStatus: "unfulfilled" | "ready" | "fulfilled" | "cancelled";
  confirmationEmailStatus: string;
  fulfillmentEmailStatus: string;
  loyverseSyncStatus: string;
  loyverseSyncAttempts: number;
  loyverseSyncClaimedAt: string | null;
  loyverseRefundSyncStatus: string | null;
  loyverseRefundSyncAttempts: number;
  loyverseRefundSyncClaimedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  deliveryDetails: Record<string, unknown> | null;
  lineItems: OperationsLineItem[];
  createdAt: string;
  updatedAt: string;
};

export function orderNeedsAttention(order: OperationsOrder) {
  const staleBefore = Date.now() - 15 * 60 * 1000;
  const stale = (status: string | null, claimedAt: string | null) => status === "processing"
    && (!claimedAt || !Number.isFinite(Date.parse(claimedAt)) || Date.parse(claimedAt) <= staleBefore);
  return order.paymentStatus !== "paid"
    || order.confirmationEmailStatus === "failed"
    || order.fulfillmentEmailStatus === "failed"
    || order.loyverseSyncStatus === "failed"
    || order.loyverseSyncAttempts >= 8
    || stale(order.loyverseSyncStatus, order.loyverseSyncClaimedAt)
    || order.loyverseRefundSyncStatus === "failed"
    || order.loyverseRefundSyncAttempts >= 8
    || stale(order.loyverseRefundSyncStatus, order.loyverseRefundSyncClaimedAt)
    || order.loyverseRefundSyncStatus === "manual_required";
}
