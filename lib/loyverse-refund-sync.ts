import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createLoyverseFullRefund,
  getLoyverseReceipt,
  listLoyverseReceiptsByOrder,
  LoyverseReceipt,
} from "@/lib/loyverse";

export type LoyverseRefundSyncInput = {
  id?: string;
  orderNumber: string;
  saleReceiptNumber?: string | null;
  createdAt?: string;
};

export function findExistingFullRefund(receipts: LoyverseReceipt[], saleReceiptNumber: string) {
  return receipts.find((receipt) => receipt.receipt_type === "REFUND" && receipt.refund_for === saleReceiptNumber && !receipt.cancelled_at);
}

export async function syncFullRefundToLoyverse(supabase: SupabaseClient | null, order: LoyverseRefundSyncInput) {
  let claimAt: string | null = null;
  if (supabase && order.id) {
    const { data: claimed, error } = await supabase.rpc("claim_order_sync", { p_order_id: order.id, p_operation: "refund" });
    if (error) throw error;
    if (!claimed) throw new Error("Loyverse refund synchronization is already claimed or complete");
    const { data: lease, error: leaseError } = await supabase.from("orders").select("loyverse_refund_sync_claimed_at").eq("id", order.id).single();
    if (leaseError || !lease?.loyverse_refund_sync_claimed_at) throw leaseError || new Error("Loyverse refund synchronization lease could not be read");
    claimAt = lease.loyverse_refund_sync_claimed_at;
  }

  try {
    const orderReceipts = await listLoyverseReceiptsByOrder(order.orderNumber, order.createdAt);
    const saleReceipt = order.saleReceiptNumber
      ? await getLoyverseReceipt(order.saleReceiptNumber)
      : orderReceipts.find((receipt) => receipt.receipt_type !== "REFUND" && !receipt.cancelled_at);
    if (!saleReceipt) throw new Error(`No Loyverse sale receipt exists for ${order.orderNumber}`);

    const existingRefund = findExistingFullRefund(orderReceipts, saleReceipt.receipt_number);
    const refund = existingRefund || await createLoyverseFullRefund(saleReceipt);
    if (supabase && order.id) {
      const { error } = await supabase.from("orders").update({
        loyverse_receipt_id: saleReceipt.receipt_number,
        loyverse_refund_receipt_id: refund.receipt_number,
        loyverse_refund_sync_status: "succeeded",
        loyverse_refund_synced_at: new Date().toISOString(),
        loyverse_refund_sync_claimed_at: null,
        loyverse_refund_sync_error: null,
      }).eq("id", order.id).eq("loyverse_refund_sync_status", "processing").eq("loyverse_refund_sync_claimed_at", claimAt);
      if (error) throw error;
    }
    return { saleReceipt, refund, reused: Boolean(existingRefund) };
  } catch (error) {
    if (supabase && order.id) {
      await supabase.from("orders").update({
        loyverse_refund_sync_status: "failed",
        loyverse_refund_sync_claimed_at: null,
        loyverse_refund_sync_error: error instanceof Error ? error.message : "Unknown Loyverse refund synchronization error",
      }).eq("id", order.id).eq("loyverse_refund_sync_status", "processing").eq("loyverse_refund_sync_claimed_at", claimAt);
    }
    throw error;
  }
}
