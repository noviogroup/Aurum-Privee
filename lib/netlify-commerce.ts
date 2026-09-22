import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { updateJsonAtomically } from "@/lib/blob-atomic";
import type { OrderSyncLine } from "@/lib/loyverse-order-sync";
import { requestFingerprint } from "@/lib/request-security";
import type { InquiryReply, InquiryStatus, OperationsInquiry } from "@/lib/operations-inquiry-types";
import type { OperationsQuoteRequest, QuoteRequestLine, QuoteRequestStatus } from "@/lib/operations-quote-types";

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

type StoredContactInquiry = Partial<OperationsInquiry> & {
  id: string;
  reference: string;
  name?: string;
  email?: string;
  phone?: string | null;
  topic: string;
  orderNumber?: string | null;
  message: string;
  createdAt: string;
  status: InquiryStatus;
};

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

function contactInquiryIndexKey(id: string) {
  return `indexes/contact-inquiry/${id}.json`;
}

function quoteRequestIndexKey(id: string) {
  return `indexes/quote-request/${id}.json`;
}

function quoteSubmissionIndexKey(submissionId: string) {
  return `indexes/quote-submission/${submissionId}.json`;
}

async function saveContactInquiryIndex(id: string, key: string) {
  try {
    await commerceStore().setJSON(contactInquiryIndexKey(id), { key });
  } catch (error) {
    console.error("Contact inquiry index update failed", { inquiryId: id, error });
  }
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
  const store = commerceStore();
  const claimed = await updateJsonAtomically<StoredEvent>({
    read: async () => await store.getWithMetadata(key, { type: "json" }) as { data: StoredEvent; etag?: string } | null,
    write: async (value, condition) => await store.setJSON(key, value, condition),
    update: (existing) => {
      const processingIsFresh = existing?.status === "processing"
        && Number.isFinite(Date.parse(existing.updatedAt))
        && Date.parse(existing.updatedAt) > Date.now() - 15 * 60 * 1000;
      if (existing?.status === "processed" || processingIsFresh) return undefined;
      return { id, type, status: "processing", error: null, updatedAt: new Date().toISOString() };
    },
  });
  return claimed.modified;
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
  const store = commerceStore();
  const { value: window } = await updateJsonAtomically<RateLimitWindow>({
    read: async () => await store.getWithMetadata(key, { type: "json" }) as { data: RateLimitWindow; etag?: string } | null,
    write: async (value, condition) => await store.setJSON(key, value, condition),
    update: (current) => !current || current.resetsAt <= now
      ? { count: 1, resetsAt: now + input.windowSeconds * 1000 }
      : { count: current.count + 1, resetsAt: current.resetsAt },
  });
  if (!window) throw new Error("Rate-limit state could not be persisted");
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
  const key = `inquiries/${createdAt}/${id}.json`;
  const store = commerceStore();
  await store.setJSON(key, {
    id,
    reference: input.reference,
    customerName: input.name,
    customerEmail: input.email,
    customerPhone: input.phone || null,
    topic: input.topic,
    orderNumber: input.orderNumber || null,
    message: input.message,
    status: "new",
    notificationStatus: "pending",
    createdAt,
    updatedAt: createdAt,
    replies: [],
  } satisfies OperationsInquiry);
  await saveContactInquiryIndex(id, key);
  return { id, reference: input.reference };
}

function normalizeContactInquiry(value: StoredContactInquiry): OperationsInquiry {
  return {
    id: value.id,
    reference: value.reference,
    customerName: value.customerName || value.name || "Client",
    customerEmail: value.customerEmail || value.email || "",
    customerPhone: value.customerPhone ?? value.phone ?? null,
    topic: value.topic,
    orderNumber: value.orderNumber || null,
    message: value.message,
    status: value.status,
    notificationStatus: value.notificationStatus || "pending",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt || value.createdAt,
    replies: Array.isArray(value.replies) ? value.replies : [],
  };
}

async function findContactInquiry(id: string) {
  const store = commerceStore();
  const index = await readJSON<{ key: string }>(contactInquiryIndexKey(id));
  if (index?.key) {
    const stored = await readJSON<StoredContactInquiry>(index.key);
    if (stored) return { key: index.key, inquiry: normalizeContactInquiry(stored) };
  }
  const { blobs } = await store.list({ prefix: "inquiries/" });
  for (const { key } of blobs) {
    if (!key.endsWith(`/${id}.json`)) continue;
    const stored = await readJSON<StoredContactInquiry>(key);
    if (stored) {
      await saveContactInquiryIndex(id, key);
      return { key, inquiry: normalizeContactInquiry(stored) };
    }
  }
  return null;
}

export async function listContactInquiries(limit = 500) {
  const { blobs } = await commerceStore().list({ prefix: "inquiries/" });
  const inquiries = (await Promise.all(blobs.slice(-limit).map(({ key }) => readJSON<StoredContactInquiry>(key))))
    .filter((value): value is StoredContactInquiry => Boolean(value))
    .map(normalizeContactInquiry)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return inquiries.slice(0, limit);
}

export async function getContactInquiry(id: string) {
  return (await findContactInquiry(id))?.inquiry || null;
}

export async function updateContactInquiry(id: string, patch: Partial<Pick<OperationsInquiry, "status" | "notificationStatus">>) {
  const stored = await findContactInquiry(id);
  if (!stored) return null;
  const store = commerceStore();
  const result = await updateJsonAtomically<StoredContactInquiry>({
    read: async () => await store.getWithMetadata(stored.key, { type: "json" }) as { data: StoredContactInquiry; etag?: string } | null,
    write: async (value, condition) => await store.setJSON(stored.key, value, condition),
    update: (current) => current
      ? { ...normalizeContactInquiry(current), ...patch, updatedAt: new Date().toISOString() }
      : undefined,
  });
  return result.value ? normalizeContactInquiry(result.value) : null;
}

export async function recordContactInquiryReply(id: string, reply: InquiryReply) {
  const stored = await findContactInquiry(id);
  if (!stored) return null;
  const store = commerceStore();
  let duplicate = false;
  const result = await updateJsonAtomically<StoredContactInquiry>({
    read: async () => await store.getWithMetadata(stored.key, { type: "json" }) as { data: StoredContactInquiry; etag?: string } | null,
    write: async (value, condition) => await store.setJSON(stored.key, value, condition),
    update: (current) => {
      if (!current) return undefined;
      const inquiry = normalizeContactInquiry(current);
      duplicate = inquiry.replies.some((item) => item.id === reply.id);
      if (duplicate) return undefined;
      return {
        ...inquiry,
        status: "replied",
        replies: [...inquiry.replies, reply],
        updatedAt: reply.sentAt,
      };
    },
  });
  return result.value ? { inquiry: normalizeContactInquiry(result.value), duplicate } : null;
}

export async function saveQuoteRequest(input: {
  submissionId: string;
  reference: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  buyerType: string;
  destinationCountry?: string;
  message?: string;
  lines: QuoteRequestLine[];
}) {
  const store = commerceStore();
  const existing = await readJSON<{ id: string; key: string }>(quoteSubmissionIndexKey(input.submissionId));
  if (existing?.key) {
    const request = await readJSON<OperationsQuoteRequest>(existing.key);
    if (request) return { request, duplicate: true };
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const key = `quote-requests/${input.submissionId}.json`;
  const request: OperationsQuoteRequest = {
    id,
    submissionId: input.submissionId,
    reference: input.reference,
    companyName: input.companyName,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone || null,
    buyerType: input.buyerType,
    destinationCountry: input.destinationCountry || null,
    message: input.message || null,
    lines: input.lines,
    status: "new",
    notificationStatus: "pending",
    createdAt,
    updatedAt: createdAt,
  };
  const creation = await store.setJSON(key, request, { onlyIfNew: true });
  if (!creation.modified) {
    const winner = await readJSON<OperationsQuoteRequest>(key);
    if (!winner) throw new Error("Quote submission was reserved without a readable request");
    return { request: winner, duplicate: true };
  }
  await Promise.all([
    store.setJSON(quoteRequestIndexKey(id), { key }),
    store.setJSON(quoteSubmissionIndexKey(input.submissionId), { id, key }),
  ]);
  return { request, duplicate: false };
}

async function findQuoteRequest(id: string) {
  const index = await readJSON<{ key: string }>(quoteRequestIndexKey(id));
  if (!index?.key) return null;
  const request = await readJSON<OperationsQuoteRequest>(index.key);
  return request ? { key: index.key, request } : null;
}

export async function listQuoteRequests(limit = 500) {
  const { blobs } = await commerceStore().list({ prefix: "quote-requests/" });
  const requests = (await Promise.all(blobs.slice(-limit).map(({ key }) => readJSON<OperationsQuoteRequest>(key))))
    .filter((value): value is OperationsQuoteRequest => Boolean(value))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return requests.slice(0, limit);
}

export async function updateQuoteRequest(id: string, patch: Partial<Pick<OperationsQuoteRequest, "status" | "notificationStatus">>) {
  const stored = await findQuoteRequest(id);
  if (!stored) return null;
  const store = commerceStore();
  const result = await updateJsonAtomically<OperationsQuoteRequest>({
    read: async () => await store.getWithMetadata(stored.key, { type: "json" }) as { data: OperationsQuoteRequest; etag?: string } | null,
    write: async (value, condition) => await store.setJSON(stored.key, value, condition),
    update: (current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : undefined,
  });
  return result.value || null;
}

export async function transitionQuoteRequest(id: string, status: QuoteRequestStatus) {
  return updateQuoteRequest(id, { status });
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
