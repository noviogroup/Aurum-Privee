import { getSupabaseAdmin } from "@/lib/supabase";
import type { OperationsLineItem, OperationsOrder } from "@/lib/operations-types";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: OperationsOrder["fulfillmentStatus"];
  confirmation_email_status: string;
  fulfillment_email_status: string;
  loyverse_sync_status: string;
  loyverse_sync_attempts: number | string;
  loyverse_sync_claimed_at: string | null;
  loyverse_refund_sync_status: string | null;
  loyverse_refund_sync_attempts: number | string;
  loyverse_refund_sync_claimed_at: string | null;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  subtotal: number | string;
  shipping_amount: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  delivery_details: Record<string, unknown> | null;
  line_items: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLine(item: Record<string, unknown>, images: Map<string, string>): OperationsLineItem {
  const productId = typeof item.productId === "string" ? item.productId : undefined;
  return {
    name: typeof item.name === "string" ? item.name : "Fragrance",
    quantity: Math.max(1, Math.round(numberValue(item.quantity))),
    amount: Math.max(0, numberValue(item.amount)),
    productId,
    image: productId ? images.get(productId) : undefined,
  };
}

function normalizeOrder(row: OrderRow, images: Map<string, string>): OperationsOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    paymentStatus: row.status,
    fulfillmentStatus: row.fulfillment_status,
    confirmationEmailStatus: row.confirmation_email_status,
    fulfillmentEmailStatus: row.fulfillment_email_status,
    loyverseSyncStatus: row.loyverse_sync_status,
    loyverseSyncAttempts: numberValue(row.loyverse_sync_attempts),
    loyverseSyncClaimedAt: row.loyverse_sync_claimed_at,
    loyverseRefundSyncStatus: row.loyverse_refund_sync_status,
    loyverseRefundSyncAttempts: numberValue(row.loyverse_refund_sync_attempts),
    loyverseRefundSyncClaimedAt: row.loyverse_refund_sync_claimed_at,
    customerName: row.customer_name || "Client",
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    subtotal: numberValue(row.subtotal),
    shippingAmount: numberValue(row.shipping_amount),
    taxAmount: numberValue(row.tax_amount),
    total: numberValue(row.total),
    currency: row.currency.toUpperCase(),
    deliveryDetails: row.delivery_details,
    lineItems: Array.isArray(row.line_items) ? row.line_items.map((item) => normalizeLine(item, images)) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOperationsOrders(limit = 250) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const configuredHost = (() => {
      try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").hostname; } catch { return ""; }
    })();
    const localPreview = process.env.OPERATIONS_DEMO_MODE === "true"
      && ["localhost", "127.0.0.1", "::1"].includes(configuredHost);
    if (localPreview) {
      const now = Date.now();
      const demo = (input: Partial<OperationsOrder> & Pick<OperationsOrder, "id" | "orderNumber" | "customerName" | "total">): OperationsOrder => ({
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        confirmationEmailStatus: "sent",
        fulfillmentEmailStatus: "sent",
        loyverseSyncStatus: "succeeded",
        loyverseSyncAttempts: 1,
        loyverseSyncClaimedAt: null,
        loyverseRefundSyncStatus: null,
        loyverseRefundSyncAttempts: 0,
        loyverseRefundSyncClaimedAt: null,
        customerEmail: "client@example.com",
        customerPhone: "(242) 555-0148",
        subtotal: Math.round(input.total / 1.1 * 100) / 100,
        shippingAmount: 0,
        taxAmount: Math.round((input.total - input.total / 1.1) * 100) / 100,
        currency: "BSD",
        deliveryDetails: null,
        lineItems: [{ name: "Abercrombie & Fitch Naturally Fierce Woman", quantity: 1, amount: input.total, image: "/product-images/loyverse/7ee5e1c6-424a-4768-b2a3-cdd513a01351.webp" }],
        createdAt: new Date(now - 18 * 60_000).toISOString(),
        updatedAt: new Date(now - 18 * 60_000).toISOString(),
        ...input,
      });
      return {
        configured: false as const,
        preview: true as const,
        orders: [
          demo({ id: "10000000-0000-0000-0000-000000000001", orderNumber: "LL-1048", customerName: "Amara Clarke", total: 126 }),
          demo({ id: "10000000-0000-0000-0000-000000000002", orderNumber: "LL-1047", customerName: "Marcus Rolle", total: 184.5, shippingAmount: 10, deliveryDetails: { address: { line1: "West Bay Street", city: "Nassau", country: "BS" } }, createdAt: new Date(now - 42 * 60_000).toISOString() }),
          demo({ id: "10000000-0000-0000-0000-000000000003", orderNumber: "LL-1046", customerName: "Priya Nair", total: 96, fulfillmentStatus: "ready", createdAt: new Date(now - 69 * 60_000).toISOString() }),
          demo({ id: "10000000-0000-0000-0000-000000000004", orderNumber: "LL-1045", customerName: "Jada Knowles", total: 212.75, loyverseSyncStatus: "failed", createdAt: new Date(now - 92 * 60_000).toISOString() }),
          demo({ id: "10000000-0000-0000-0000-000000000005", orderNumber: "LL-1044", customerName: "Darren Bain", total: 78, fulfillmentStatus: "fulfilled", createdAt: new Date(now - 118 * 60_000).toISOString() }),
        ],
      };
    }
    return { configured: false as const, preview: false as const, orders: [] as OperationsOrder[] };
  }
  const { data, error } = await supabase.from("orders")
    .select("id,order_number,status,fulfillment_status,confirmation_email_status,fulfillment_email_status,loyverse_sync_status,loyverse_sync_attempts,loyverse_sync_claimed_at,loyverse_refund_sync_status,loyverse_refund_sync_attempts,loyverse_refund_sync_claimed_at,customer_name,customer_email,customer_phone,subtotal,shipping_amount,tax_amount,total,currency,delivery_details,line_items,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)));
  if (error) throw new Error("Orders could not be loaded");
  const rows = (data || []) as OrderRow[];
  const productIds = [...new Set(rows.flatMap((row) => row.line_items || [])
    .map((item) => typeof item.productId === "string" ? item.productId : null)
    .filter((id): id is string => Boolean(id)))];
  const images = new Map<string, string>();
  if (productIds.length) {
    const { data: products } = await supabase.from("products").select("id,image_url").in("id", productIds.slice(0, 500));
    (products || []).forEach((product) => {
      if (product.image_url) images.set(product.id, product.image_url);
    });
  }
  return { configured: true as const, preview: false as const, orders: rows.map((row) => normalizeOrder(row, images)) };
}
