import { NextResponse } from "next/server";
import { hasBearerSecret } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";

const allowedFulfillmentStatuses = new Set(["all", "unfulfilled", "ready", "fulfilled", "cancelled"]);

export async function GET(request: Request) {
  if (!hasBearerSecret(request, process.env.SYNC_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const url = new URL(request.url);
  const status = allowedFulfillmentStatuses.has(url.searchParams.get("fulfillment") || "") ? url.searchParams.get("fulfillment") || "all" : "all";
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  let query = supabase.from("orders")
    .select("id,order_number,status,fulfillment_status,confirmation_email_status,fulfillment_email_status,loyverse_sync_status,loyverse_refund_sync_status,customer_name,customer_email,customer_phone,subtotal,shipping_amount,tax_amount,total,currency,delivery_details,line_items,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("fulfillment_status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Orders could not be loaded" }, { status: 500 });
  return NextResponse.json({ orders: data || [], count: data?.length || 0, fulfillment: status });
}
