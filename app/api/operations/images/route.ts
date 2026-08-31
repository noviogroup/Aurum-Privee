import { NextResponse } from "next/server";
import { getOperationsImageCatalog } from "@/lib/operations-images";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { maximumProductImageBytes, ProductImageValidationError, publishProductImage } from "@/lib/product-image-upload";
import { consumeRateLimit } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getOperationsImageCatalog());
  } catch (error) {
    console.error("Operations image catalog load failed", error);
    return NextResponse.json({ error: "Product images could not be loaded" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const declaredLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) return NextResponse.json({ error: "Upload size is required." }, { status: 411 });
  if (declaredLength > maximumProductImageBytes + 100_000) {
    return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Publish product images through the repository image-intake workflow." }, { status: 503 });
  try {
    const rateLimit = await consumeRateLimit({ supabase, request, scope: "operations-image-upload", limit: 30, windowSeconds: 3600 });
    if (!rateLimit.allowed) return NextResponse.json({ error: "Too many image uploads. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
    const form = await request.formData();
    const productId = form.get("productId");
    const file = form.get("image");
    if (typeof productId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      return NextResponse.json({ error: "Choose a valid catalog product." }, { status: 400 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    if (file.size > maximumProductImageBytes) return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });
    const result = await publishProductImage({ productId, filename: file.name || "product-image", contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ProductImageValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Product image upload failed", error);
    return NextResponse.json({ error: "Product image could not be published." }, { status: 500 });
  }
}
