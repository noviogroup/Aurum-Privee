import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/operator-auth";
import { hasOperatorSession } from "@/lib/operator-session";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deliverFulfillmentUpdate } from "@/lib/transactional-email";
import { sendFulfillmentEmail } from "@/lib/email";
import { getCommerceOrder, updateCommerceOrder } from "@/lib/netlify-commerce";

const schema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["ready", "fulfilled", "cancelled"]),
});

export async function POST(request: Request) {
  if (!await hasOperatorSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const input = schema.parse(await readJsonBody<unknown>(request, 2_048));
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const order = await getCommerceOrder(input.orderId);
      if (!order) return NextResponse.json({ error: "Order was not found" }, { status: 404 });
      if (order.fulfillmentStatus === input.status && order.fulfillmentEmailStatus === "sent") {
        return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, status: order.fulfillmentStatus, duplicate: true });
      }
      let emailSent = false;
      try {
        await sendFulfillmentEmail({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: input.status,
          isDelivery: order.shippingAmount > 0,
        });
        emailSent = true;
      } catch {
        emailSent = false;
      }
      await updateCommerceOrder(order.id, {
        fulfillmentStatus: input.status,
        fulfillmentEmailStatus: emailSent ? "sent" : "failed",
      });
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: input.status,
        emailSent,
        ...(!emailSent ? { error: "The order was updated, but its customer email needs retry." } : {}),
      }, { status: emailSent ? 200 : 502 });
    }
    const { data, error } = await supabase.rpc("transition_order_fulfillment", { p_order_id: input.orderId, p_next_status: input.status });
    if (error) throw error;
    const order = Array.isArray(data) ? data[0] : data;
    if (!order) return NextResponse.json({ error: "Order was not found" }, { status: 404 });
    if (!order.email_required) return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, status: order.fulfillment_status, duplicate: true });
    try {
      await deliverFulfillmentUpdate(supabase, {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        shipping_amount: order.shipping_amount,
        fulfillment_status: input.status,
      });
      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, status: order.fulfillment_status, emailSent: true });
    } catch {
      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, status: order.fulfillment_status, emailSent: false, error: "The order was updated, but its customer email needs retry." }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Invalid fulfillment request" }, { status: 400 });
    console.error("Operations fulfillment transition failed", error);
    return NextResponse.json({ error: "Order fulfillment could not be updated" }, { status: 500 });
  }
}
