import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { OrderSyncLine } from "@/lib/loyverse-order-sync";
import { requestFingerprint } from "@/lib/request-security";

export type CommerceOrderStatus = "paid" | "partially_refunded" | "refunded";
export type CommerceFulfillmentStatus = "unfulfilled" | "ready" | "fulfilled" | "cancelled";

export type CommerceOrder = {
  id: string;
  orderNumber: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  status: CommerceOrderStatus;
  fulfillmentStatus: CommerceFulfillmentStatus;
  confirmationEmailStatus: "pending" | "sent" | "failed" | "not_sent";
  fulfillmentEmailStatus: "pending" | "sent" | "failed" | "not_sent";
  loyverseSyncStatus: "pending" | "processing" | "succeeded" | "failed";
  loyverseSyncAttempts: number;
  loyverseSyncClaimedAt: string | null;
  loyverseReceiptId: string | null;
  loyverseRefundSyncStatus: "pending" | "processing" | "succeeded" | "failed" | "manual_required" | null;
  loyverseRefundSyncAttempts: number;
  loyverseRefundSyncClaimedAt: string | null;
  loyverseRefundReceiptId: string | null;
  refundedAmount: number;
  deliveryDetails: Record<string, unknown> | null;
  lineItems: OrderSyncLine[];
  createdAt: string;
  updatedAt: string;
};

type StoredEvent = {
  id: string;
  type: string;
  status: "processing" | "processed" | "failed";
  error: string | null;
  updatedAt: string;
};

type RateLimitWindow = { count: number; resetsAt: number };

function commerceStore() {
  return getStore({ name: "aurum-privee-commerce", consistency: "strong" });
}

function orderKey(id: string) {
  return `orders/by-id/${id}.json`;
}

function sessionKey(sessionId: string) {
  return `indexes/stripe-session/${sessionId}.json`;
}

function paymentIntentKey(paymentIntentId: string) {
  return `indexes/payment-intent/${paymentIntentId}.json`;
}

async function readJSON<T>(key: string) {
  return await commerceStore().get(key, { type: "json" }) as T | null;
}

export async function saveCommerceOrder(order: CommerceOrder) {
  const store = commerceStore();
  const updated = { ...order, updatedAt: new Date().toISOString() };
  await Promise.all([
    store.setJSON(orderKey(updated.id), updated),
    store.setJSON(sessionKey(updated.stripeSessionId), { orderId: updated.id }),
    updated.stripePaymentIntentId
      ? store.setJSON(paymentIntentKey(updated.stripePaymentIntentId), { orderId: updated.id })
      : Promise.resolve(),
  ]);
  return updated;
}

export async function getCommerceOrder(id: string) {
  return await readJSON<CommerceOrder>(orderKey(id));
}

export async function getCommerceOrderBySession(sessionId: string) {
  const index = await readJSON<{ orderId: string }>(sessionKey(sessionId));
  if (index?.orderId) return await getCommerceOrder(index.orderId);
  return (await listCommerceOrders(500)).find((order) => order.stripeSessionId === sessionId) || null;
}

export async function getCommerceOrderByPaymentIntent(paymentIntentId: string) {
  const index = await readJSON<{ orderId: string }>(paymentIntentKey(paymentIntentId));
  if (index?.orderId) return await getCommerceOrder(index.orderId);
  return (await listCommerceOrders(500)).find((order) => order.stripePaymentIntentId === paymentIntentId) || null;
}

export async function updateCommerceOrder(id: string, patch: Partial<CommerceOrder>) {
  const current = await getCommerceOrder(id);
  if (!current) return null;
  return await saveCommerceOrder({ ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() });
}

export async function listCommerceOrders(limit = 250) {
  const { blobs } = await commerceStore().list({ prefix: "orders/by-id/" });
  const orders = (await Promise.all(blobs.map(({ key }) => readJSON<CommerceOrder>(key))))
    .filter((order): order is CommerceOrder => Boolean(order));
  return orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, limit);
}

export async function claimCommerceEvent(id: string, type: string) {
  const key = `events/${id}.json`;
  const existing = await readJSON<StoredEvent>(key);
  const processingIsFresh = existing?.status === "processing"
    && Number.isFinite(Date.parse(existing.updatedAt))
    && Date.parse(existing.updatedAt) > Date.now() - 15 * 60 * 1000;
  if (existing?.status === "processed" || processingIsFresh) return false;
  await commerceStore().setJSON(key, {
    id,
    type,
    status: "processing",
    error: null,
    updatedAt: new Date().toISOString(),
  } satisfies StoredEvent);
  return true;
}

export async function completeCommerceEvent(id: string, type: string, error?: string) {
  await commerceStore().setJSON(`events/${id}.json`, {
    id,
    type,
    status: error ? "failed" : "processed",
    error: error || null,
    updatedAt: new Date().toISOString(),
  } satisfies StoredEvent);
}

export async function consumeBlobRateLimit(input: {
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
  global?: boolean;
}) {
  const fingerprint = input.global
    ? crypto.createHash("sha256").update(`global:${process.env.RATE_LIMIT_SECRET || ""}`).digest("hex")
    : requestFingerprint(input.request);
  if (!fingerprint) return { configured: false, allowed: false, remaining: 0, retryAfter: input.windowSeconds };
  const key = `rate-limits/${input.scope}/${fingerprint}.json`;
  const now = Date.now();
  const current = await readJSON<RateLimitWindow>(key);
  const window = !current || current.resetsAt <= now
    ? { count: 1, resetsAt: now + input.windowSeconds * 1000 }
    : { count: current.count + 1, resetsAt: current.resetsAt };
  await commerceStore().setJSON(key, window);
  return {
    configured: true,
    allowed: window.count <= input.limit,
    remaining: Math.max(0, input.limit - window.count),
    retryAfter: Math.max(1, Math.ceil((window.resetsAt - now) / 1000)),
  };
}

export async function saveContactInquiry(input: {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  orderNumber?: string;
  message: string;
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await commerceStore().setJSON(`inquiries/${createdAt}/${id}.json`, { id, ...input, createdAt, status: "new" });
  return { id, reference: input.reference };
}

export async function saveNewsletterConfirmation(input: { email: string; tokenHash: string; expiresAt: string }) {
  await commerceStore().setJSON(`newsletter/confirmations/${input.tokenHash}.json`, {
    email: input.email,
    expiresAt: input.expiresAt,
    requestedAt: new Date().toISOString(),
  });
}

export async function confirmNewsletterSubscription(tokenHash: string) {
  const key = `newsletter/confirmations/${tokenHash}.json`;
  const pending = await readJSON<{ email: string; expiresAt: string }>(key);
  if (!pending || Date.parse(pending.expiresAt) <= Date.now()) return null;
  const emailHash = crypto.createHash("sha256").update(pending.email.toLowerCase()).digest("hex");
  await Promise.all([
    commerceStore().setJSON(`newsletter/subscribers/${emailHash}.json`, {
      email: pending.email.toLowerCase(),
      status: "subscribed",
      confirmedAt: new Date().toISOString(),
      source: "storefront",
    }),
    commerceStore().delete(key),
  ]);
  return pending.email;
}
