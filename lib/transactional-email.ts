import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendContactInquiryNotification,
  sendFulfillmentEmail,
  sendOrderEmails,
} from "@/lib/email";

type OrderLine = { name?: unknown; quantity?: unknown; amount?: unknown };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Transactional email delivery failed";
}

export async function deliverOrderConfirmation(supabase: SupabaseClient, order: {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  total: number | string;
  line_items: OrderLine[];
}) {
  const { data: claimed, error: claimError } = await supabase.rpc("claim_order_email", { p_order_id: order.id, p_kind: "confirmation" });
  if (claimError) throw claimError;
  if (!claimed) return { claimed: false, sent: false };
  try {
    await sendOrderEmails({
      orderNumber: order.order_number,
      customerName: order.customer_name || "Client",
      customerEmail: order.customer_email,
      total: Number(order.total),
      items: (order.line_items || []).map((line) => ({
        name: typeof line.name === "string" ? line.name : "Fragrance",
        quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
        amount: Math.max(0, Number(line.amount) || 0),
      })),
    });
    const { data, error } = await supabase.rpc("complete_order_email", {
      p_order_id: order.id,
      p_kind: "confirmation",
      p_status: "sent",
      p_error: null,
      p_fulfillment_status: null,
    });
    if (error) throw error;
    if (!data) throw new Error("Order confirmation state changed before completion");
    return { claimed: true, sent: true };
  } catch (error) {
    await supabase.rpc("complete_order_email", {
      p_order_id: order.id,
      p_kind: "confirmation",
      p_status: "failed",
      p_error: errorMessage(error),
      p_fulfillment_status: null,
    });
    throw error;
  }
}

export async function deliverFulfillmentUpdate(supabase: SupabaseClient, order: {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  shipping_amount: number | string;
  fulfillment_status: "ready" | "fulfilled" | "cancelled";
}) {
  const { data: claimed, error: claimError } = await supabase.rpc("claim_order_email", { p_order_id: order.id, p_kind: "fulfillment" });
  if (claimError) throw claimError;
  if (!claimed) return { claimed: false, sent: false };
  try {
    await sendFulfillmentEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name || "Client",
      customerEmail: order.customer_email,
      status: order.fulfillment_status,
      isDelivery: Number(order.shipping_amount || 0) > 0,
    });
    const { data, error } = await supabase.rpc("complete_order_email", {
      p_order_id: order.id,
      p_kind: "fulfillment",
      p_status: "sent",
      p_error: null,
      p_fulfillment_status: order.fulfillment_status,
    });
    if (error) throw error;
    if (!data) throw new Error("Fulfillment state changed before email completion");
    return { claimed: true, sent: true };
  } catch (error) {
    await supabase.rpc("complete_order_email", {
      p_order_id: order.id,
      p_kind: "fulfillment",
      p_status: "failed",
      p_error: errorMessage(error),
      p_fulfillment_status: order.fulfillment_status,
    });
    throw error;
  }
}

export async function deliverContactNotification(supabase: SupabaseClient, inquiry: {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  topic: string;
  order_number: string | null;
  message: string;
}) {
  const { data: claimed, error: claimError } = await supabase.rpc("claim_contact_inquiry_notification", { p_inquiry_id: inquiry.id });
  if (claimError) throw claimError;
  if (!claimed) return { claimed: false, sent: false };
  try {
    await sendContactInquiryNotification({
      reference: inquiry.reference,
      name: inquiry.customer_name,
      email: inquiry.customer_email,
      phone: inquiry.customer_phone || undefined,
      topic: inquiry.topic,
      orderNumber: inquiry.order_number || undefined,
      message: inquiry.message,
    });
    const { data, error } = await supabase.rpc("set_contact_inquiry_notification", { p_inquiry_id: inquiry.id, p_status: "sent", p_error: null });
    if (error) throw error;
    if (!data) throw new Error("Inquiry notification state changed before completion");
    return { claimed: true, sent: true };
  } catch (error) {
    await supabase.rpc("set_contact_inquiry_notification", { p_inquiry_id: inquiry.id, p_status: "failed", p_error: errorMessage(error) });
    throw error;
  }
}
