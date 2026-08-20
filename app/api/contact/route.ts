import { NextResponse } from "next/server";
import { z } from "zod";
import { contactInquirySchema } from "@/lib/contact-inquiry";
import { isConfiguredSecret } from "@/lib/env";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { consumeRateLimit, readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deliverContactNotification } from "@/lib/transactional-email";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ message: "Client care will open when the secure store connection is complete." }, { status: 503 });
    if (![process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL, process.env.STORE_NOTIFICATION_EMAIL].every(isConfiguredSecret)) {
      return NextResponse.json({ message: "Client care will open when merchant email is configured." }, { status: 503 });
    }

    const visitorLimit = await consumeRateLimit({ supabase, request, scope: "contact", limit: 5, windowSeconds: 86_400 });
    if (!visitorLimit.configured) return NextResponse.json({ message: "Client-care protection is not configured." }, { status: 503 });
    if (!visitorLimit.allowed) return NextResponse.json({ message: "Please wait before sending another note." }, { status: 429, headers: { "Retry-After": String(visitorLimit.retryAfter) } });
    const globalLimit = await consumeRateLimit({ supabase, request, scope: "contact-global", limit: 300, windowSeconds: 3_600, global: true });
    if (!globalLimit.allowed) return NextResponse.json({ message: "Client care is briefly busy. Please try again later." }, { status: 503, headers: { "Retry-After": String(globalLimit.retryAfter) } });

    const input = contactInquirySchema.parse(await readJsonBody<unknown>(request, 8_192));
    if (input.website) return NextResponse.json({ message: "Your note has been received.", reference: "" });
    const { data, error } = await supabase.rpc("create_contact_inquiry", {
      p_name: input.name,
      p_email: input.email,
      p_phone: input.phone || null,
      p_topic: input.topic,
      p_order_number: input.orderNumber || null,
      p_message: input.message,
    });
    if (error) throw error;
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.inquiry_id || !created?.inquiry_reference) throw new Error("Inquiry was not created");

    try {
      await deliverContactNotification(supabase, {
        id: created.inquiry_id,
        reference: created.inquiry_reference,
        customer_name: input.name,
        customer_email: input.email,
        customer_phone: input.phone || null,
        topic: input.topic,
        order_number: input.orderNumber || null,
        message: input.message,
      });
    } catch (notificationError) {
      const errorMessage = notificationError instanceof Error ? notificationError.message : "Notification failed";
      console.error("Contact inquiry notification failed", { inquiryId: created.inquiry_id, error: errorMessage });
    }

    return NextResponse.json({ message: "Your note has been received.", reference: created.inquiry_reference });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ message: "That note is too large." }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ message: "Review your details and write at least 20 characters." }, { status: 400 });
    console.error("Contact inquiry failed", error);
    return NextResponse.json({ message: "We could not save your note. Please try again shortly." }, { status: 500 });
  }
}
