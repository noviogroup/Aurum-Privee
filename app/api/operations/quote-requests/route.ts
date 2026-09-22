import { NextResponse } from "next/server";
import { z } from "zod";
import { transitionQuoteRequest } from "@/lib/netlify-commerce";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { getOperationsQuoteRequests } from "@/lib/operations-quotes";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

const statusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["new", "reviewing", "needs_info", "quoted", "closed"]),
}).strict();

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getOperationsQuoteRequests());
}

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const input = statusSchema.parse(await readJsonBody<unknown>(request, 4_096));
    const updated = await transitionQuoteRequest(input.requestId, input.status);
    if (!updated) return NextResponse.json({ error: "Quote request was not found" }, { status: 404 });
    return NextResponse.json({ requestId: updated.id, status: updated.status });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Update is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Review the quote update" }, { status: 400 });
    console.error("Quote request update failed", error);
    return NextResponse.json({ error: "Quote request could not be updated" }, { status: 500 });
  }
}
