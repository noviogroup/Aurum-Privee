import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendQuoteRequestEmails } from "@/lib/email";
import { isConfiguredSecret } from "@/lib/env";
import { getCatalogProductsByIds } from "@/lib/catalog";
import { saveQuoteRequest, consumeBlobRateLimit, updateQuoteRequest } from "@/lib/netlify-commerce";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { quoteRequestSchema } from "@/lib/quote-request";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    if (![process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL, process.env.STORE_NOTIFICATION_EMAIL].every(isConfiguredSecret)) {
      return NextResponse.json({ message: "Trade enquiries will open when merchant email is configured." }, { status: 503 });
    }
    const limit = await consumeBlobRateLimit({ request, scope: "quote-request", limit: 8, windowSeconds: 86_400 });
    if (!limit.configured) return NextResponse.json({ message: "Quote-request protection is not configured." }, { status: 503 });
    if (!limit.allowed) return NextResponse.json({ message: "Please wait before sending another quote request." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const input = quoteRequestSchema.parse(await readJsonBody<unknown>(request, 24_000));
    if (input.website) return NextResponse.json({ message: "Your request has been received.", reference: "" });
    const products = await getCatalogProductsByIds(input.lines.map((line) => line.productId));
    const byId = new Map(products.map((product) => [product.id, product]));
    const unavailable = input.lines.filter((line) => !byId.has(line.productId));
    if (unavailable.length) return NextResponse.json({ message: "One or more fragrances are no longer available. Refresh your quote list and try again.", unavailableProductIds: unavailable.map((line) => line.productId) }, { status: 409 });
    const reference = `APQ-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    const saved = await saveQuoteRequest({
      submissionId: input.submissionId,
      reference,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      buyerType: input.buyerType,
      destinationCountry: input.destinationCountry,
      message: input.message,
      lines: input.lines.map((line) => {
        const product = byId.get(line.productId)!;
        return { productId: product.id, slug: product.slug, brand: product.brand, name: product.name, concentration: product.concentration, size: product.size, quantity: line.quantity, note: line.note || null };
      }),
    });
    if (!saved.duplicate) {
      try {
        await sendQuoteRequestEmails(saved.request);
        await updateQuoteRequest(saved.request.id, { notificationStatus: "sent" });
      } catch (error) {
        await updateQuoteRequest(saved.request.id, { notificationStatus: "failed" });
        console.error("Quote request email failed", { quoteRequestId: saved.request.id, error: error instanceof Error ? error.message : "Email failed" });
      }
    }
    return NextResponse.json({ message: "Your quote request has been received.", reference: saved.request.reference, duplicate: saved.duplicate });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ message: "That quote request is too large." }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ message: "Review your company, contact and requested quantities." }, { status: 400 });
    console.error("Quote request failed", error);
    return NextResponse.json({ message: "We could not save your quote request. Please try again shortly." }, { status: 500 });
  }
}
