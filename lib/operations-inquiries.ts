import { getSupabaseAdmin } from "@/lib/supabase";
import type { InquiryReply, InquiryStatus, OperationsInquiries, OperationsInquiry } from "@/lib/operations-inquiry-types";

type InquiryRow = {
  id: string; reference: string; customer_name: string; customer_email: string; customer_phone: string | null;
  topic: string; order_number: string | null; message: string; status: InquiryStatus; notification_status: OperationsInquiry["notificationStatus"];
  created_at: string; updated_at: string; contact_inquiry_replies?: Array<{ id: string; message: string; provider_message_id: string | null; sent_at: string }>;
};

function normalize(row: InquiryRow): OperationsInquiry {
  return {
    id: row.id, reference: row.reference, customerName: row.customer_name, customerEmail: row.customer_email,
    customerPhone: row.customer_phone, topic: row.topic, orderNumber: row.order_number, message: row.message,
    status: row.status, notificationStatus: row.notification_status, createdAt: row.created_at, updatedAt: row.updated_at,
    replies: (row.contact_inquiry_replies || []).map((reply): InquiryReply => ({ id: reply.id, message: reply.message, providerMessageId: reply.provider_message_id, sentAt: reply.sent_at })),
  };
}

function result(inquiries: OperationsInquiry[], configured: boolean, preview: boolean): OperationsInquiries {
  return { inquiries, configured, preview, totals: {
    all: inquiries.length,
    open: inquiries.filter((item) => item.status === "new" || item.status === "in_progress").length,
    replied: inquiries.filter((item) => item.status === "replied").length,
    closed: inquiries.filter((item) => item.status === "closed").length,
  } };
}

export async function getOperationsInquiries(): Promise<OperationsInquiries> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const localPreview = process.env.OPERATIONS_DEMO_MODE === "true" && (() => { try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.NEXT_PUBLIC_SITE_URL || "").hostname); } catch { return false; } })();
    if (!localPreview) return result([], false, false);
    const now = Date.now();
    return result([
      { id: "40000000-0000-0000-0000-000000000001", reference: "APC-8F2A913C44", customerName: "Amara Clarke", customerEmail: "amara@example.com", customerPhone: "(242) 555-0148", topic: "Fragrance guidance", orderNumber: null, message: "I’m looking for a polished floral fragrance for evening events. I usually enjoy rose, iris and soft woods, but nothing overly sweet.", status: "new", notificationStatus: "sent", createdAt: new Date(now - 34 * 60_000).toISOString(), updatedAt: new Date(now - 34 * 60_000).toISOString(), replies: [] },
      { id: "40000000-0000-0000-0000-000000000002", reference: "APC-72D4B8A109", customerName: "Marcus Rolle", customerEmail: "marcus@example.com", customerPhone: null, topic: "Order help", orderNumber: "AP-1047", message: "Could you confirm whether my order is scheduled for delivery or pickup? I selected delivery during checkout.", status: "in_progress", notificationStatus: "sent", createdAt: new Date(now - 4 * 60 * 60_000).toISOString(), updatedAt: new Date(now - 3 * 60 * 60_000).toISOString(), replies: [] },
      { id: "40000000-0000-0000-0000-000000000003", reference: "APC-51EA307C62", customerName: "Priya Nair", customerEmail: "priya@example.com", customerPhone: null, topic: "Gifting", orderNumber: null, message: "I need a fragrance gift for someone who likes clean citrus scents. Please suggest two options around BSD $100.", status: "replied", notificationStatus: "sent", createdAt: new Date(now - 26 * 60 * 60_000).toISOString(), updatedAt: new Date(now - 22 * 60 * 60_000).toISOString(), replies: [{ id: "50000000-0000-0000-0000-000000000001", message: "We’d be delighted to help. We have two fresh options in that range and will hold them for you to sample.", providerMessageId: "preview", sentAt: new Date(now - 22 * 60 * 60_000).toISOString() }] },
    ], false, true);
  }
  const { data, error } = await supabase.from("contact_inquiries")
    .select("id,reference,customer_name,customer_email,customer_phone,topic,order_number,message,status,notification_status,created_at,updated_at,contact_inquiry_replies(id,message,provider_message_id,sent_at)")
    .order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Client-care inquiries could not be loaded");
  return result(((data || []) as InquiryRow[]).map(normalize), true, false);
}
