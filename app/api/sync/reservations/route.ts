import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasBearerSecret } from "@/lib/env";

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.SYNC_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await supabase.rpc("expire_checkout_inventory");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expiredReservations: Number(data || 0), completedAt: new Date().toISOString() });
}
