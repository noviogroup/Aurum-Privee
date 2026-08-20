import { Resend } from "resend";
import { formatMoney, siteConfig } from "@/lib/config";
import { isConfiguredSecret } from "@/lib/env";

type OrderEmail = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{ name: string; quantity: number; amount: number }>;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export async function sendOrderEmails(order: OrderEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!isConfiguredSecret(apiKey) || !isConfiguredSecret(from)) throw new Error("Order email is not configured");

  const resend = new Resend(apiKey);
  const rows = order.items
    .map((item) => `<tr><td style="padding:10px 0">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:10px 0;text-align:right">${formatMoney(item.amount)}</td></tr>`)
    .join("");
  const safeOrderNumber = escapeHtml(order.orderNumber);
  const html = `<div style="font-family:Arial,sans-serif;color:#1d1c19;max-width:600px;margin:auto"><p style="color:#aa8140;letter-spacing:.18em;text-transform:uppercase;font-size:11px">Aurum Privée</p><h1 style="font-family:Georgia,serif;font-weight:400">Your fragrance is reserved.</h1><p>Hi ${escapeHtml(order.customerName)}, we received order ${safeOrderNumber}. We will email you again when it is ready for pickup or delivery.</p><table style="width:100%;border-collapse:collapse">${rows}<tr><td style="padding:16px 0;border-top:1px solid #d8cfc1"><strong>Total</strong></td><td style="padding:16px 0;border-top:1px solid #d8cfc1;text-align:right"><strong>${formatMoney(order.total)}</strong></td></tr></table><p style="color:#6d675e">Aurum Privée<br>Nassau, The Bahamas</p></div>`;

  const customer = resend.emails.send({ from, to: order.customerEmail, subject: `Order ${order.orderNumber.replace(/[\r\n]/g, "")} confirmed`, html }, { idempotencyKey: `lola-lily/order-confirmation/${order.orderNumber}/customer` });
  const notificationEmail = process.env.STORE_NOTIFICATION_EMAIL;
  const merchant = isConfiguredSecret(notificationEmail)
    ? resend.emails.send({ from, to: notificationEmail, subject: `New Aurum Privée order ${order.orderNumber.replace(/[\r\n]/g, "")}`, html }, { idempotencyKey: `lola-lily/order-confirmation/${order.orderNumber}/merchant` })
    : Promise.resolve(null);

  const [customerResult, merchantResult] = await Promise.all([customer, merchant]);
  if (customerResult.error) throw new Error(customerResult.error.message);
  if (merchantResult?.error) throw new Error(merchantResult.error.message);
  return { customerResult, merchantResult };
}

export async function sendNewsletterConfirmation(input: { email: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!isConfiguredSecret(apiKey) || !isConfiguredSecret(from) || !siteUrl) throw new Error("Newsletter confirmation email is not configured");
  const confirmationUrl = new URL("/newsletter/confirm", siteUrl);
  confirmationUrl.searchParams.set("token", input.token);
  const html = `<div style="font-family:Arial,sans-serif;color:#1d1c19;max-width:600px;margin:auto"><p style="color:#aa8140;letter-spacing:.18em;text-transform:uppercase;font-size:11px">Aurum Privée</p><h1 style="font-family:Georgia,serif;font-weight:400">One beautiful click.</h1><p>Confirm that you would like occasional notes from Aurum Privée about new arrivals, gifts and invitations.</p><p><a href="${escapeHtml(confirmationUrl.toString())}" style="display:inline-block;background:#aa8140;color:#fff;padding:14px 22px;text-decoration:none">Confirm my subscription</a></p><p style="color:#6d675e;font-size:13px">This link expires in 24 hours. If you did not request it, no action is needed.</p></div>`;
  const delivery = await new Resend(apiKey).emails.send({ from, to: input.email, subject: "Confirm your Aurum Privée subscription", html });
  if (delivery.error) throw new Error(delivery.error.message);
  return delivery;
}

export async function sendContactInquiryNotification(input: {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  orderNumber?: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.STORE_NOTIFICATION_EMAIL;
  if (!isConfiguredSecret(apiKey) || !isConfiguredSecret(from) || !isConfiguredSecret(to)) throw new Error("Client-care email is not configured");
  const safeReference = input.reference.replace(/[^A-Z0-9-]/gi, "").slice(0, 32);
  const rows = [
    ["From", `${input.name} (${input.email})`],
    ["Phone", input.phone || "Not provided"],
    ["Topic", input.topic],
    ["Order", input.orderNumber || "Not provided"],
  ].map(([label, value]) => `<tr><th style="padding:8px 14px 8px 0;text-align:left;vertical-align:top">${escapeHtml(label)}</th><td style="padding:8px 0">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#1d1c19;max-width:640px;margin:auto"><p style="color:#aa8140;letter-spacing:.18em;text-transform:uppercase;font-size:11px">Aurum Privée · Client care</p><h1 style="font-family:Georgia,serif;font-weight:400">A client left a note.</h1><p><strong>${escapeHtml(safeReference)}</strong></p><table style="width:100%;border-collapse:collapse">${rows}</table><div style="margin-top:20px;padding:20px;background:#f4efe7;white-space:pre-wrap">${escapeHtml(input.message)}</div></div>`;
  const delivery = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: input.email,
    subject: `Aurum Privée inquiry ${safeReference}: ${input.topic}`.replace(/[\r\n]/g, "").slice(0, 150),
    html,
  }, { idempotencyKey: `lola-lily/contact/${safeReference}` });
  if (delivery.error) throw new Error(delivery.error.message);
  return delivery;
}

export async function sendContactInquiryReply(input: {
  replyId: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!isConfiguredSecret(apiKey) || !isConfiguredSecret(from)) throw new Error("Client-care email is not configured");
  const safeReference = input.reference.replace(/[^A-Z0-9-]/gi, "").slice(0, 32);
  const body = escapeHtml(input.message).replace(/\r?\n/g, "<br>");
  const html = `<div style="font-family:Arial,sans-serif;color:#1d1c19;max-width:640px;margin:auto"><p style="color:#aa8140;letter-spacing:.18em;text-transform:uppercase;font-size:11px">Aurum Privée · Client care</p><h1 style="font-family:Georgia,serif;font-weight:400">A note from Aurum Privée.</h1><p>Hi ${escapeHtml(input.customerName || "there")},</p><p style="line-height:1.65">${body}</p><p style="margin-top:28px;color:#6d675e">Reference ${escapeHtml(safeReference)}<br>Aurum Privée · Nassau, The Bahamas</p></div>`;
  const delivery = await new Resend(apiKey).emails.send({
    from,
    to: input.customerEmail,
    subject: `Aurum Privée reply · ${safeReference}`.replace(/[\r\n]/g, ""),
    html,
  }, { idempotencyKey: `lola-lily/contact-reply/${input.replyId}` });
  if (delivery.error) throw new Error(delivery.error.message);
  return delivery;
}

export async function sendFulfillmentEmail(input: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "ready" | "fulfilled" | "cancelled";
  isDelivery: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!isConfiguredSecret(apiKey) || !isConfiguredSecret(from)) throw new Error("Fulfillment email is not configured");
  const safeName = escapeHtml(input.customerName || "Client");
  const safeNumber = escapeHtml(input.orderNumber);
  const content = input.status === "ready"
    ? input.isDelivery
      ? { subject: `Order ${input.orderNumber} is ready for delivery`, title: "Your fragrance is ready.", body: "Your order has been packed and is ready for delivery. Our team will confirm the delivery handoff details." }
      : { subject: `Order ${input.orderNumber} is ready for pickup`, title: "Your fragrance is ready.", body: `Your order is packed and ready for pickup at ${escapeHtml(siteConfig.pickupLabel)}. Please bring your order number.` }
    : input.status === "fulfilled"
      ? { subject: `Order ${input.orderNumber} is complete`, title: "A beautiful trace, delivered.", body: input.isDelivery ? "Your order has been delivered. We hope it becomes part of a memorable ritual." : "Your order has been collected. We hope it becomes part of a memorable ritual." }
      : { subject: `Order ${input.orderNumber} was cancelled`, title: "Your order was cancelled.", body: "This order will not be fulfilled. If a payment was captured, our team will contact you about its refund status." };
  const html = `<div style="font-family:Arial,sans-serif;color:#1d1c19;max-width:600px;margin:auto"><p style="color:#aa8140;letter-spacing:.18em;text-transform:uppercase;font-size:11px">Aurum Privée</p><h1 style="font-family:Georgia,serif;font-weight:400">${content.title}</h1><p>Hi ${safeName}, ${content.body}</p><p><strong>Order ${safeNumber}</strong></p><p style="color:#6d675e">Aurum Privée<br>Nassau, The Bahamas</p></div>`;
  const delivery = await new Resend(apiKey).emails.send({ from, to: input.customerEmail, subject: content.subject.replace(/[\r\n]/g, ""), html }, { idempotencyKey: `lola-lily/${input.orderNumber}/${input.status}` });
  if (delivery.error) throw new Error(delivery.error.message);
  return delivery;
}
