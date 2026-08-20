import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactInquiryReply } from "@/lib/email";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { getOperationsInquiries } from "@/lib/operations-inquiries";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), inquiryId: z.string().uuid(), status: z.enum(["new", "in_progress", "closed"]) }).strict(),
  z.object({ action: z.literal("reply"), inquiryId: z.string().uuid(), message: z.string().trim().min(10).max(4_000), replyId: z.string().uuid() }).strict(),
]);

export async function GET() {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getOperationsInquiries()); }
  catch (error) { console.error("Operations inquiries load failed", error); return NextResponse.json({ error: "Client care could not be loaded" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    const input = schema.parse(await readJsonBody<unknown>(request, 8_192));
    if (input.action === "status") {
      const { data, error } = await supabase.rpc("transition_contact_inquiry", { p_inquiry_id: input.inquiryId, p_status: input.status });
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Inquiry was not found" }, { status: 404 });
      return NextResponse.json({ inquiryId: input.inquiryId, status: input.status });
    }
    const { data: inquiry, error } = await supabase.from("contact_inquiries")
      .select("id,reference,customer_name,customer_email,status")
      .eq("id", input.inquiryId).maybeSingle();
    if (error) throw error;
    if (!inquiry) return NextResponse.json({ error: "Inquiry was not found" }, { status: 404 });
    const { data: existingReply } = await supabase.from("contact_inquiry_replies").select("id").eq("id", input.replyId).maybeSingle();
    if (existingReply) return NextResponse.json({ inquiryId: input.inquiryId, status: "replied", duplicate: true });
    const delivery = await sendContactInquiryReply({ replyId: input.replyId, reference: inquiry.reference, customerName: inquiry.customer_name, customerEmail: inquiry.customer_email, message: input.message });
    const providerId = delivery.data?.id || crypto.createHash("sha256").update(input.replyId).digest("hex");
    const { data: recorded, error: recordError } = await supabase.rpc("record_contact_inquiry_reply", { p_reply_id: input.replyId, p_inquiry_id: input.inquiryId, p_message: input.message, p_provider_message_id: providerId });
    if (recordError) throw recordError;
    if (!recorded) return NextResponse.json({ error: "Reply could not be recorded" }, { status: 500 });
    return NextResponse.json({ inquiryId: input.inquiryId, status: "replied", emailSent: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Inquiry update is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Review the inquiry update and try again" }, { status: 400 });
    console.error("Operations inquiry update failed", error);
    return NextResponse.json({ error: "The inquiry could not be updated" }, { status: 500 });
  }
}
