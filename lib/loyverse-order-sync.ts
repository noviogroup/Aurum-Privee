import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createLoyverseReceipt,
  findLoyverseReceiptByOrder,
  findOrCreateLoyverseCustomer,
} from "@/lib/loyverse";
import { calculateAddedTax, CommerceTax, grossFromNet, roundMoney } from "@/lib/tax";

export type OrderSyncLine = {
  name: string;
  quantity: number;
  amount: number;
  productId?: string;
  loyverseVariantId?: string;
  taxIds?: string[];
  taxes?: CommerceTax[];
  unitPrice: number;
};

export type LoyverseOrderSyncInput = {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAmount?: number;
  paidTotal?: number;
  createdAt?: string;
  deliveryDetails?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
  lines: OrderSyncLine[];
};

export function prepareLoyverseReceipt(
  order: LoyverseOrderSyncInput,
  deliveryVariantId?: string,
  deliveryTaxIds: string[] = [],
  deliveryAddedTaxRate = 0,
) {
  const missingVariants = order.lines.filter((line) => !line.loyverseVariantId);
  if (missingVariants.length) {
    throw new Error(`Cannot create Loyverse receipt. Missing variant mapping for: ${missingVariants.map((line) => line.name).join(", ")}`);
  }

  const lines = order.lines.flatMap((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error(`Invalid receipt quantity for ${line.name}`);
    const totalCents = Math.round(line.amount * 100);
    if (totalCents < 0) throw new Error(`Invalid receipt amount for ${line.name}`);
    const lowerPriceCents = Math.floor(totalCents / line.quantity);
    const higherPriceQuantity = totalCents % line.quantity;
    const lowerPriceQuantity = line.quantity - higherPriceQuantity;
    return [
      ...(higherPriceQuantity ? [{ variantId: line.loyverseVariantId!, quantity: higherPriceQuantity, price: (lowerPriceCents + 1) / 100, taxIds: line.taxIds || [] }] : []),
      ...(lowerPriceQuantity ? [{ variantId: line.loyverseVariantId!, quantity: lowerPriceQuantity, price: lowerPriceCents / 100, taxIds: line.taxIds || [] }] : []),
    ];
  });
  const shippingAmount = roundMoney(order.shippingAmount || 0);
  if (shippingAmount > 0 && deliveryVariantId) {
    lines.push({ variantId: deliveryVariantId, quantity: 1, price: shippingAmount, taxIds: deliveryTaxIds });
  }

  const merchandiseGross = order.lines.reduce((sum, line) => sum + line.amount + calculateAddedTax(line.amount, line.taxes), 0);
  const deliveryGross = grossFromNet(shippingAmount, deliveryAddedTaxRate);
  const moneyAmount = roundMoney(merchandiseGross + deliveryGross);
  if (typeof order.paidTotal === "number" && Math.abs(moneyAmount - roundMoney(order.paidTotal)) > 0.009) {
    throw new Error(`Loyverse receipt total ${moneyAmount.toFixed(2)} does not match paid total ${roundMoney(order.paidTotal).toFixed(2)}`);
  }

  return {
    lines,
    moneyAmount,
    note: shippingAmount > 0 && !deliveryVariantId
      ? `Online order for ${order.customerName}. ${shippingAmount.toFixed(2)} delivery charge recorded by the payment gateway and excluded from this receipt because LOYVERSE_DELIVERY_VARIANT_ID is not configured.`
      : `Online order for ${order.customerName}`,
  };
}

export async function syncOrderToLoyverse(supabase: SupabaseClient | null, order: LoyverseOrderSyncInput) {
  let claimAt: string | null = null;
  if (supabase && order.id) {
    const { data: claimed, error } = await supabase.rpc("claim_order_sync", { p_order_id: order.id, p_operation: "sale" });
    if (error) throw error;
    if (!claimed) throw new Error("Loyverse sale synchronization is already claimed or complete");
    const { data: lease, error: leaseError } = await supabase.from("orders").select("loyverse_sync_claimed_at").eq("id", order.id).single();
    if (leaseError || !lease?.loyverse_sync_claimed_at) throw leaseError || new Error("Loyverse sale synchronization lease could not be read");
    claimAt = lease.loyverse_sync_claimed_at;
  }

  try {
    const existingReceipt = await findLoyverseReceiptByOrder(order.orderNumber, order.createdAt);
    if (existingReceipt) {
      if (supabase && order.id) {
        const { error } = await supabase.from("orders").update({
          loyverse_receipt_id: existingReceipt.receipt_number,
          loyverse_customer_id: existingReceipt.customer_id || null,
          loyverse_sync_status: "succeeded",
          loyverse_synced_at: new Date().toISOString(),
          loyverse_sync_claimed_at: null,
          loyverse_sync_error: null,
        }).eq("id", order.id).eq("loyverse_sync_status", "processing").eq("loyverse_sync_claimed_at", claimAt);
        if (error) throw error;
      }
      return { receipt: existingReceipt, reused: true };
    }

    let customerId: string | undefined;
    if (process.env.LOYVERSE_SYNC_CUSTOMERS === "true" && order.customerEmail) {
      const customer = await findOrCreateLoyverseCustomer({
        name: order.deliveryDetails?.name || order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.deliveryDetails?.address ? {
          line1: order.deliveryDetails.address.line1,
          line2: order.deliveryDetails.address.line2,
          city: order.deliveryDetails.address.city,
          state: order.deliveryDetails.address.state,
          postalCode: order.deliveryDetails.address.postal_code,
          country: order.deliveryDetails.address.country,
        } : null,
      });
      customerId = customer.id;
    }

    const deliveryTaxIds = (process.env.LOYVERSE_DELIVERY_TAX_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
    const deliveryAddedTaxRate = Number(process.env.LOYVERSE_DELIVERY_ADDED_TAX_RATE || 0);
    if (!Number.isFinite(deliveryAddedTaxRate) || deliveryAddedTaxRate < 0) throw new Error("LOYVERSE_DELIVERY_ADDED_TAX_RATE is invalid");
    const preparedReceipt = prepareLoyverseReceipt(order, process.env.LOYVERSE_DELIVERY_VARIANT_ID, deliveryTaxIds, deliveryAddedTaxRate);

    const receipt = await createLoyverseReceipt({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerId,
      moneyAmount: preparedReceipt.moneyAmount,
      lines: preparedReceipt.lines,
      note: preparedReceipt.note,
    });

    if (supabase && order.id) {
      const { error } = await supabase.from("orders").update({
        loyverse_receipt_id: receipt.receipt_number,
        loyverse_customer_id: customerId || null,
        loyverse_sync_status: "succeeded",
        loyverse_synced_at: new Date().toISOString(),
        loyverse_sync_claimed_at: null,
        loyverse_sync_error: null,
      }).eq("id", order.id).eq("loyverse_sync_status", "processing").eq("loyverse_sync_claimed_at", claimAt);
      if (error) throw error;
    }
    return { receipt, reused: false };
  } catch (error) {
    if (supabase && order.id) {
      await supabase.from("orders").update({
        loyverse_sync_status: "failed",
        loyverse_sync_claimed_at: null,
        loyverse_sync_error: error instanceof Error ? error.message : "Unknown Loyverse order synchronization error",
      }).eq("id", order.id).eq("loyverse_sync_status", "processing").eq("loyverse_sync_claimed_at", claimAt);
    }
    throw error;
  }
}
