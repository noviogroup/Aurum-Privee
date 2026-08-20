import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/health";
import { hasBearerSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasBearerSecret(request, process.env.HEALTH_MONITOR_SECRET)) {
    return NextResponse.json({ status: "ok" }, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  try {
    const health = await getHealthStatus();
    return NextResponse.json(health, {
      status: health.status === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ status: "unavailable", checkedAt: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
}
