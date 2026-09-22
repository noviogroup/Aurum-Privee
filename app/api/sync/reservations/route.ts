import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasBearerSecret } from "@/lib/env";
import { legacyCommerceEnabled } from "@/lib/provider-operations";

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.SYNC_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!legacyCommerceEnabled()) return NextResponse.json({ expiredReservations: 0, skipped: "wix-commerce-active", completedAt: new Date().toISOString() });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await supabase.rpc("expire_checkout_inventory");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expiredReservations: Number(data || 0), completedAt: new Date().toISOString() });
}
