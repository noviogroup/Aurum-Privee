import { NextResponse } from "next/server";
import { z } from "zod";
import { hasBearerSecret } from "@/lib/env";
import { OrderSyncLine, syncOrderToLoyverse } from "@/lib/loyverse-order-sync";
import { syncFullRefundToLoyverse } from "@/lib/loyverse-refund-sync";
import { isLoyverseSyncEligible, LOYVERSE_SYNC_MAX_ATTEMPTS, LOYVERSE_SYNC_STALE_AFTER_MS } from "@/lib/loyverse-sync-recovery";
import { readRequestText, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";

const requestSchema = z.object({ orderId: z.string().uuid().optional(), limit: z.number().int().min(1).max(50).default(20) }).default({ limit: 20 });
const selection = "id,order_number,customer_name,customer_email,customer_phone,shipping_amount,total,delivery_details,line_items,status,loyverse_receipt_id,loyverse_sync_status,loyverse_sync_attempts,loyverse_sync_claimed_at,loyverse_refund_sync_status,loyverse_refund_sync_attempts,loyverse_refund_sync_claimed_at,created_at";

type RetryOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  shipping_amount: number | string;
  total: number | string;
  delivery_details: Record<string, unknown> | null;
  line_items: OrderSyncLine[];
  status: string;
  loyverse_receipt_id: string | null;
  loyverse_sync_status: string;
  loyverse_sync_attempts: number;
  loyverse_sync_claimed_at: string | null;
  loyverse_refund_sync_status: string;
  loyverse_refund_sync_attempts: number;
  loyverse_refund_sync_claimed_at: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.SYNC_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  try {
    const bodyText = await readRequestText(request, 2_048);
    const input = requestSchema.parse(bodyText ? JSON.parse(bodyText) : undefined);
    const staleBefore = new Date(Date.now() - LOYVERSE_SYNC_STALE_AFTER_MS).toISOString();
    const candidateLimit = Math.min(200, input.limit * 4);

    let saleQuery = supabase.from("orders").select(selection)
      .in("status", ["paid", "partially_refunded", "refunded"])
      .lt("loyverse_sync_attempts", LOYVERSE_SYNC_MAX_ATTEMPTS)
      .or(`loyverse_sync_status.in.(pending,failed),and(loyverse_sync_status.eq.processing,loyverse_sync_claimed_at.is.null),and(loyverse_sync_status.eq.processing,loyverse_sync_claimed_at.lt.${staleBefore})`)
      .order("created_at", { ascending: true }).limit(candidateLimit);
    let refundQuery = supabase.from("orders").select(selection)
      .eq("status", "refunded")
      .lt("loyverse_refund_sync_attempts", LOYVERSE_SYNC_MAX_ATTEMPTS)
      .or(`loyverse_refund_sync_status.in.(pending,failed),and(loyverse_refund_sync_status.eq.processing,loyverse_refund_sync_claimed_at.is.null),and(loyverse_refund_sync_status.eq.processing,loyverse_refund_sync_claimed_at.lt.${staleBefore})`)
      .order("created_at", { ascending: true }).limit(candidateLimit);
    if (input.orderId) {
      saleQuery = saleQuery.eq("id", input.orderId);
      refundQuery = refundQuery.eq("id", input.orderId);
    }
    const [saleResult, refundResult] = await Promise.all([saleQuery, refundQuery]);
    if (saleResult.error) throw saleResult.error;
    if (refundResult.error) throw refundResult.error;

    const merged = new Map<string, RetryOrder>();
    for (const row of [...(saleResult.data || []), ...(refundResult.data || [])] as RetryOrder[]) merged.set(row.id, row);
    const now = new Date();
    const orders = [...merged.values()].sort((left, right) => left.created_at.localeCompare(right.created_at)).slice(0, input.limit);
    const results = [];

    for (const order of orders) {
      try {
        let saleReceiptNumber = order.loyverse_receipt_id;
        let saleReused: boolean | undefined;
        if (isLoyverseSyncEligible({ status: order.loyverse_sync_status, attempts: order.loyverse_sync_attempts, claimedAt: order.loyverse_sync_claimed_at }, now)) {
          const sale = await syncOrderToLoyverse(supabase, {
            id: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || "Client",
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            shippingAmount: Number(order.shipping_amount || 0),
            paidTotal: Number(order.total),
            createdAt: order.created_at,
            deliveryDetails: order.delivery_details,
            lines: order.line_items,
          });
          saleReceiptNumber = sale.receipt.receipt_number;
          saleReused = sale.reused;
        }
        let refundReceiptNumber: string | undefined;
        let refundReused: boolean | undefined;
        if (order.status === "refunded" && isLoyverseSyncEligible({ status: order.loyverse_refund_sync_status, attempts: order.loyverse_refund_sync_attempts, claimedAt: order.loyverse_refund_sync_claimed_at }, now)) {
          const refund = await syncFullRefundToLoyverse(supabase, { id: order.id, orderNumber: order.order_number, saleReceiptNumber, createdAt: order.created_at });
          refundReceiptNumber = refund.refund.receipt_number;
          refundReused = refund.reused;
        }
        results.push({ orderId: order.id, orderNumber: order.order_number, status: "succeeded", saleReceiptNumber, saleReused, refundReceiptNumber, refundReused });
      } catch (syncError) {
        results.push({ orderId: order.id, orderNumber: order.order_number, status: "failed", error: syncError instanceof Error ? syncError.message : "Unknown error" });
      }
    }

    return NextResponse.json({ processed: results.length, succeeded: results.filter((result) => result.status === "succeeded").length, failed: results.filter((result) => result.status === "failed").length, results });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Invalid retry request" }, { status: 400 });
    console.error("Order synchronization retry failed", error);
    return NextResponse.json({ error: "Order synchronization failed" }, { status: 500 });
  }
}
