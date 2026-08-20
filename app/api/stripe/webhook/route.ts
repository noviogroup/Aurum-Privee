import { NextResponse } from "next/server";
import Stripe from "stripe";
import { OrderSyncLine, syncOrderToLoyverse } from "@/lib/loyverse-order-sync";
import { syncFullRefundToLoyverse } from "@/lib/loyverse-refund-sync";
import { getSupabaseAdmin } from "@/lib/supabase";
import { netFromGross, parseCommerceTaxes, roundMoney } from "@/lib/tax";
import { isConfiguredSecret } from "@/lib/env";
import { readRequestText, RequestBodyTooLargeError } from "@/lib/request-security";
import { deliverOrderConfirmation } from "@/lib/transactional-email";

export const runtime = "nodejs";

async function setEventState(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, eventId: string, status: "processed" | "failed", error?: string) {
  await supabase.from("stripe_webhook_events").update({
    status,
    error: error || null,
    processed_at: status === "processed" ? new Date().toISOString() : null,
  }).eq("event_id", eventId);
}

async function handleRefundedCharge(charge: Stripe.Charge, supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return NextResponse.json({ received: true, ignored: "refund has no payment intent" });
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_email,customer_phone,shipping_amount,total,delivery_details,line_items,loyverse_receipt_id,loyverse_sync_status,loyverse_refund_sync_status,created_at")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Refund order lookup failed" }, { status: 500 });
  if (!order) {
    if (charge.metadata?.channel === "aurum-privee-web") return NextResponse.json({ error: "Store order is not persisted yet" }, { status: 500 });
    return NextResponse.json({ received: true, ignored: "unrelated charge" });
  }

  const refundedAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.amount_refunded >= charge.amount;
  const { error: updateError } = await supabase.from("orders").update({
    status: isFullRefund ? "refunded" : "partially_refunded",
    refunded_amount: refundedAmount,
    loyverse_refund_sync_status: isFullRefund
      ? (order.loyverse_refund_sync_status === "succeeded" ? "succeeded" : "pending")
      : "manual_required",
    loyverse_refund_sync_error: isFullRefund ? null : "Partial payment refunds require a line-level refund in Loyverse Back Office.",
  }).eq("id", order.id);
  if (updateError) return NextResponse.json({ error: "Refund persistence failed" }, { status: 500 });
  if (!isFullRefund) return NextResponse.json({ received: true, partialRefund: true, manualLoyverseRefundRequired: true });
  if (order.loyverse_refund_sync_status === "succeeded") {
    return NextResponse.json({ received: true, fullRefund: true, loyverseRefundSynchronized: true, duplicate: true });
  }

  if (isConfiguredSecret(process.env.LOYVERSE_ACCESS_TOKEN)) {
    try {
      let saleReceiptNumber = order.loyverse_receipt_id as string | null;
      if (!saleReceiptNumber || order.loyverse_sync_status !== "succeeded") {
        const sale = await syncOrderToLoyverse(supabase, {
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name || "Client",
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAmount: Number(order.shipping_amount || 0),
          paidTotal: Number(order.total),
          createdAt: order.created_at,
          deliveryDetails: order.delivery_details,
          lines: order.line_items as OrderSyncLine[],
        });
        saleReceiptNumber = sale.receipt.receipt_number;
      }
      await syncFullRefundToLoyverse(supabase, { id: order.id, orderNumber: order.order_number, saleReceiptNumber, createdAt: order.created_at });
      return NextResponse.json({ received: true, fullRefund: true, loyverseRefundSynchronized: true });
    } catch {
      return NextResponse.json({ received: true, fullRefund: true, loyverseRefundSynchronized: false });
    }
  }
  return NextResponse.json({ received: true, fullRefund: true, loyverseRefundSynchronized: false });
}

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isConfiguredSecret(key) || !isConfiguredSecret(webhookSecret)) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let rawBody: string;
  try {
    rawBody = await readRequestText(request, 1_048_576);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Stripe webhook body is too large" }, { status: 413 });
    return NextResponse.json({ error: "Stripe webhook could not be read" }, { status: 400 });
  }

  const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: claimed, error: claimError } = await supabase.rpc("claim_stripe_webhook_event", { p_event_id: event.id, p_event_type: event.type });
    if (claimError) return NextResponse.json({ error: "Stripe event claim failed" }, { status: 500 });
    if (!claimed) return NextResponse.json({ received: true, duplicate: true });
  }
  if (event.type === "checkout.session.expired") {
    if (!supabase) return NextResponse.json({ error: "Supabase is required for inventory reservations" }, { status: 503 });
    const checkoutReference = event.data.object.metadata?.checkout_reference;
    if (checkoutReference) {
      const { error } = await supabase.rpc("release_checkout_inventory", { p_checkout_reference: checkoutReference, p_status: "expired" });
      if (error) return NextResponse.json({ error: "Inventory reservation release failed" }, { status: 500 });
    }
    await setEventState(supabase, event.id, "processed");
    return NextResponse.json({ received: true, inventoryReleased: Boolean(checkoutReference) });
  }
  if (event.type === "charge.refunded") {
    if (!supabase) return NextResponse.json({ error: "Supabase is required for refund synchronization" }, { status: 503 });
    const response = await handleRefundedCharge(event.data.object, supabase);
    await setEventState(supabase, event.id, response.ok ? "processed" : "failed", response.ok ? undefined : "Refund processing failed");
    return response;
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    if (supabase) await setEventState(supabase, event.id, "processed");
    return NextResponse.json({ received: true });
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") {
    if (supabase) await setEventState(supabase, event.id, "processed");
    return NextResponse.json({ received: true, paymentPending: true });
  }
  if (!supabase) return NextResponse.json({ error: "Supabase is required for paid order persistence" }, { status: 503 });
  if (session.metadata?.channel !== "aurum-privee-web") {
    await setEventState(supabase, event.id, "processed");
    return NextResponse.json({ received: true, ignored: "unrelated checkout" });
  }
  const checkoutReference = session.metadata?.checkout_reference;
  if (!checkoutReference) {
    await setEventState(supabase, event.id, "failed", "Paid checkout is missing its inventory reservation");
    return NextResponse.json({ error: "Paid checkout is missing its inventory reservation" }, { status: 500 });
  }

  const { data: existing } = await supabase.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) {
    await setEventState(supabase, event.id, "processed");
    return NextResponse.json({ received: true, duplicate: true });
  }

  const checkoutLines = await stripe.checkout.sessions.listLineItems(session.id, { expand: ["data.price.product"], limit: 100 });
  const parsedLines = checkoutLines.data.map((line) => {
    const stripeProduct = typeof line.price?.product === "object" ? line.price.product as Stripe.Product : null;
    return {
      kind: stripeProduct?.metadata.line_kind || "product",
      name: line.description || "Fragrance",
      quantity: line.quantity || 1,
      amount: (line.amount_total || 0) / 100,
      productId: stripeProduct?.metadata.product_id || "",
      loyverseVariantId: stripeProduct?.metadata.loyverse_variant_id || "",
      taxIds: (stripeProduct?.metadata.loyverse_tax_ids || "").split(",").filter(Boolean),
      taxes: parseCommerceTaxes(stripeProduct?.metadata.loyverse_taxes),
      unitPrice: line.quantity ? (line.amount_total || 0) / 100 / line.quantity : 0,
    };
  });
  const lines = parsedLines.filter((line) => line.kind === "product").map((line) => ({
    name: line.name,
    quantity: line.quantity,
    amount: line.amount,
    productId: line.productId,
    loyverseVariantId: line.loyverseVariantId,
    taxIds: line.taxIds,
    taxes: line.taxes,
    unitPrice: line.unitPrice,
  }));
  if (!lines.length || lines.some((line) => !line.productId || line.quantity < 1)) {
    await setEventState(supabase, event.id, "failed", "Paid checkout has invalid product lines");
    return NextResponse.json({ error: "Paid inventory requires manual reconciliation" }, { status: 500 });
  }
  const { data: conversion, error: conversionError } = await supabase.rpc("convert_checkout_inventory", {
    p_checkout_reference: checkoutReference,
    p_stripe_session_id: session.id,
    p_items: lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
  });
  if (conversionError) {
    await setEventState(supabase, event.id, "failed", conversionError.message);
    return NextResponse.json({ error: "Paid inventory requires manual reconciliation" }, { status: 500 });
  }
  const conversionResult = Array.isArray(conversion) ? conversion[0] : conversion;
  if (!conversionResult || !["converted", "already_converted"].includes(conversionResult.state)) {
    await setEventState(supabase, event.id, "failed", "Invalid inventory conversion state");
    return NextResponse.json({ error: "Paid inventory requires manual reconciliation" }, { status: 500 });
  }
  const merchandiseTaxAmount = parsedLines.filter((line) => line.kind === "added_tax").reduce((sum, line) => sum + line.amount, 0);
  const orderNumber = `AP-${session.id.slice(-8).toUpperCase()}`;
  const total = (session.amount_total || 0) / 100;
  const customerEmail = session.customer_details?.email || "";
  const customerName = session.customer_details?.name || "Client";
  const merchandiseTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const checkoutLineTotal = parsedLines.reduce((sum, line) => sum + line.amount, 0);
  const shippingGrossAmount = Math.max(0, roundMoney(total - checkoutLineTotal));
  const deliveryAddedTaxRate = Number(session.metadata?.delivery_added_tax_rate || 0);
  if (!Number.isFinite(deliveryAddedTaxRate) || deliveryAddedTaxRate < 0) return NextResponse.json({ error: "Paid checkout has invalid delivery tax metadata" }, { status: 500 });
  const shippingAmount = netFromGross(shippingGrossAmount, deliveryAddedTaxRate);
  const taxAmount = roundMoney(merchandiseTaxAmount + shippingGrossAmount - shippingAmount);
  let orderId: string | undefined;

  {
    const { data, error } = await supabase.from("orders").insert({
      order_number: orderNumber,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: session.customer_details?.phone,
      currency: session.currency,
      subtotal: merchandiseTotal,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total,
      status: "paid",
      fulfillment_status: "unfulfilled",
      fulfillment_email_status: "not_sent",
      confirmation_email_status: customerEmail ? "pending" : "not_sent",
      delivery_details: session.collected_information?.shipping_details || null,
      line_items: lines,
      checkout_reference: checkoutReference,
    }).select("id").single();
    if (error) {
      await setEventState(supabase, event.id, "failed", error.message);
      return NextResponse.json({ error: "Order persistence failed" }, { status: 500 });
    }
    orderId = data.id;
  }

  const sideEffects: Promise<unknown>[] = [];
  if (customerEmail) sideEffects.push(deliverOrderConfirmation(supabase, {
    id: orderId!,
    order_number: orderNumber,
    customer_name: customerName,
    customer_email: customerEmail,
    total,
    line_items: lines,
  }));
  if (isConfiguredSecret(process.env.LOYVERSE_ACCESS_TOKEN)) {
    sideEffects.push(syncOrderToLoyverse(supabase, {
      id: orderId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone: session.customer_details?.phone,
      shippingAmount,
      paidTotal: total,
      createdAt: new Date(session.created * 1000).toISOString(),
      deliveryDetails: session.collected_information?.shipping_details || null,
      lines,
    }));
  }

  const outcomes = await Promise.allSettled(sideEffects);
  const sideEffectErrors = outcomes.filter((outcome) => outcome.status === "rejected").length;
  await setEventState(supabase, event.id, "processed");
  return NextResponse.json({ received: true, sideEffectErrors });
}
