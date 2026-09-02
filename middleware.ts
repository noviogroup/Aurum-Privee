import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase-auth-middleware";

export async function middleware(request: NextRequest) {
  return await updateSupabaseSession(request);
}

export const config = {
  matcher: ["/account/:path*", "/auth/:path*", "/checkout/:path*"],
};
