import { NextResponse } from "next/server";
import { syncLoyverseCatalog } from "@/lib/loyverse-sync";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasBearerSecret } from "@/lib/env";

export const maxDuration = 60;

function isAuthorized(request: Request) {
  return hasBearerSecret(request, process.env.SYNC_SECRET);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  try {
    const result = await syncLoyverseCatalog({ supabase, deactivateMissing: true, source: "manual" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Loyverse sync failed" }, { status: 500 });
  }
}
