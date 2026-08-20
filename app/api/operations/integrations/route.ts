import { NextResponse } from "next/server";
import { getOperationsReadiness } from "@/lib/operations-integrations";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    return NextResponse.json(await getOperationsReadiness({ live: true }));
  } catch (error) {
    console.error("Integration readiness checks failed", error);
    return NextResponse.json({ error: "Live integration checks could not be completed" }, { status: 500 });
  }
}
