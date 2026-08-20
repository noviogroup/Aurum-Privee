import { NextResponse } from "next/server";
import { getOperationsOrders } from "@/lib/operations-orders";
import { hasOperatorSession } from "@/lib/operator-session";

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await getOperationsOrders();
    if (!result.configured) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    return NextResponse.json({ orders: result.orders });
  } catch (error) {
    console.error("Operations order load failed", error);
    return NextResponse.json({ error: "Orders could not be loaded" }, { status: 500 });
  }
}

