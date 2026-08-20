import { NextResponse } from "next/server";
import { z } from "zod";
import { getOperationsCatalog, publishProductCuration } from "@/lib/operations-catalog";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { productCurationSchema } from "@/lib/product-curation";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getOperationsCatalog()); }
  catch (error) { console.error("Operations catalog load failed", error); return NextResponse.json({ error: "Catalog could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const input = productCurationSchema.parse(await readJsonBody<unknown>(request, 8_192));
    const result = await publishProductCuration({ id: input.productId, ...input });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Curation request is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Review the curation fields and try again" }, { status: 400 });
    console.error("Product curation failed", error);
    return NextResponse.json({ error: "Product curation could not be saved" }, { status: 500 });
  }
}
