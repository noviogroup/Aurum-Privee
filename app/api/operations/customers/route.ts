import { NextResponse } from "next/server";
import { z } from "zod";
import { customerProfileSchema } from "@/lib/customer-profile";
import { getOperationsCustomers, publishCustomerProfile } from "@/lib/operations-customers";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getOperationsCustomers()); }
  catch (error) { console.error("Operations customers load failed", error); return NextResponse.json({ error: "Customers could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const input = customerProfileSchema.parse(await readJsonBody<unknown>(request, 8_192));
    return NextResponse.json(await publishCustomerProfile(input));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Customer profile request is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Review the customer profile and try again" }, { status: 400 });
    console.error("Customer profile save failed", error);
    return NextResponse.json({ error: "Customer profile could not be saved" }, { status: 500 });
  }
}
