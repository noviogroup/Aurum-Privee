import crypto from "node:crypto";
import { isConfiguredSecret, isStrongSecret } from "@/lib/env";

const LOYVERSE_BASE_URL = "https://api.loyverse.com/v1.0";

export type LoyverseStoreOverride = {
  store_id: string;
  pricing_type?: "FIXED" | "VARIABLE";
  price?: number | null;
  available_for_sale?: boolean;
};

export type LoyverseVariant = {
  variant_id: string;
  item_id?: string;
  sku?: string;
  barcode?: string;
  default_pricing_type?: "FIXED" | "VARIABLE";
  default_price?: number | null;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  stores?: LoyverseStoreOverride[];
  updated_at?: string;
  deleted_at?: string | null;
};

export type LoyverseItem = {
  id: string;
  item_name: string;
  description?: string;
  reference_id?: string;
  category_id?: string;
  tax_ids?: string[];
  track_stock: boolean;
  sold_by_weight?: boolean;
  image_url?: string;
  option1_name?: string;
  option2_name?: string;
  option3_name?: string;
  variants: LoyverseVariant[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type LoyverseInventoryLevel = {
  variant_id: string;
  store_id: string;
  in_stock: number;
  updated_at?: string;
};

export type LoyverseMerchant = {
  id: string;
  business_name: string;
  email: string;
  country: string;
  currency: { code: string; decimal_places: number };
};

export type LoyverseStore = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  deleted_at?: string | null;
};

export type LoyversePaymentType = {
  id: string;
  name: string;
  type: string;
  stores: string[];
  deleted_at?: string | null;
};

export type LoyverseCategory = {
  id: string;
  name: string;
  deleted_at?: string | null;
};

export type LoyverseTax = {
  id: string;
  name: string;
  type: "INCLUDED" | "ADDED";
  rate: number;
  stores: string[];
  deleted_at?: string | null;
};

export type LoyverseWebhookType = "inventory_levels.update" | "items.update" | "customers.update" | "receipts.update" | "shifts.create";

export type LoyverseWebhook = {
  id: string;
  merchant_id: string;
  url: string;
  type: LoyverseWebhookType;
  status: "ENABLED" | "DISABLED";
};

export type LoyverseCustomer = {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  note?: string;
  deleted_at?: string | null;
};

export type LoyverseReceipt = {
  receipt_number: string;
  receipt_type?: "SALE" | "REFUND";
  refund_for?: string;
  order?: string;
  customer_id?: string;
  total_money: number;
  cancelled_at?: string | null;
  line_items?: Array<{ id: string; variant_id: string; quantity: number; price: number; total_money?: number }>;
};

export class LoyverseApiError extends Error {
  constructor(public status: number, public responseBody: string) {
    super(`Loyverse request failed (${status}): ${responseBody}`);
    this.name = "LoyverseApiError";
  }
}

function getAccessToken() {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!isConfiguredSecret(token)) throw new Error("Loyverse is not configured");
  return token;
}

async function loyverseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const attempts = 3;
  let lastNetworkError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const timeout = AbortSignal.timeout(15_000);
      const response = await fetch(`${LOYVERSE_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
        signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
      });

      if (response.ok) return response.json() as Promise<T>;
      const responseBody = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts - 1) throw new LoyverseApiError(response.status, responseBody);
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(Math.max(retryAfterSeconds * 1000, 0), 5_000)
        : 250 * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      if (error instanceof LoyverseApiError) throw error;
      lastNetworkError = error;
      if (attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw new Error(`Loyverse network request failed: ${lastNetworkError instanceof Error ? lastNetworkError.message : "unknown network error"}`);
}

async function listPaginated<T>(path: string, key: string) {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({ limit: "250" });
    if (cursor) query.set("cursor", cursor);
    const separator = path.includes("?") ? "&" : "?";
    const page = await loyverseFetch<Record<string, T[] | string | undefined>>(`${path}${separator}${query}`);
    all.push(...((page[key] as T[] | undefined) || []));
    cursor = page.cursor as string | undefined;
  } while (cursor);
  return all;
}

export async function getLoyverseMerchant() {
  return loyverseFetch<LoyverseMerchant>("/merchant/");
}

export async function listLoyverseStores() {
  return (await listPaginated<LoyverseStore>("/stores", "stores")).filter((store) => !store.deleted_at);
}

export async function listLoyversePaymentTypes() {
  return (await listPaginated<LoyversePaymentType>("/payment_types", "payment_types")).filter((type) => !type.deleted_at);
}

export async function listLoyverseCategories() {
  return (await listPaginated<LoyverseCategory>("/categories", "categories")).filter((category) => !category.deleted_at);
}

export async function listLoyverseTaxes() {
  return (await listPaginated<LoyverseTax>("/taxes", "taxes")).filter((tax) => !tax.deleted_at);
}

export async function getLoyverseItem(itemId: string) {
  return loyverseFetch<LoyverseItem>(`/items/${encodeURIComponent(itemId)}`);
}

export async function getLoyverseVariant(variantId: string) {
  return loyverseFetch<LoyverseVariant>(`/variants/${encodeURIComponent(variantId)}`);
}

export async function getLoyverseInventoryLevel(variantId: string) {
  const levels = await listInventory([variantId]);
  const storeId = process.env.LOYVERSE_STORE_ID;
  return levels.find((level) => level.store_id === storeId) || null;
}

export async function listAllLoyverseItems() {
  return (await listPaginated<LoyverseItem>("/items", "items")).filter((item) => !item.deleted_at);
}

export async function listInventory(variantIds: string[]) {
  if (!variantIds.length) return [];
  const storeId = process.env.LOYVERSE_STORE_ID;
  if (!storeId) throw new Error("LOYVERSE_STORE_ID is required for inventory synchronization");
  const query = new URLSearchParams({ variant_ids: variantIds.join(","), store_ids: storeId });
  return listPaginated<LoyverseInventoryLevel>(`/inventory?${query}`, "inventory_levels");
}

export function resolveVariantForStore(variant: LoyverseVariant, storeId: string) {
  const override = variant.stores?.find((store) => store.store_id === storeId);
  if (override?.available_for_sale === false || variant.deleted_at) return { available: false, price: null };
  const pricingType = override?.pricing_type || variant.default_pricing_type || (typeof variant.default_price === "number" ? "FIXED" : "VARIABLE");
  const price = override?.pricing_type === "FIXED" ? override.price : variant.default_price;
  if (pricingType !== "FIXED" || typeof price !== "number") return { available: false, price: null };
  return { available: true, price };
}

export async function listLoyverseWebhooks() {
  const response = await loyverseFetch<LoyverseWebhook[] | { webhooks?: LoyverseWebhook[] }>("/webhooks/");
  return Array.isArray(response) ? response : response.webhooks || [];
}

export async function upsertLoyverseWebhook(input: { id?: string; url: string; type: LoyverseWebhookType; status?: "ENABLED" | "DISABLED" }) {
  return loyverseFetch<LoyverseWebhook>("/webhooks/", {
    method: "POST",
    body: JSON.stringify({ ...input, status: input.status || "ENABLED" }),
  });
}

export async function findLoyverseCustomerByEmail(email: string) {
  const query = new URLSearchParams({ email, limit: "1" });
  const data = await loyverseFetch<{ customers: LoyverseCustomer[] }>(`/customers?${query}`);
  return data.customers.find((customer) => !customer.deleted_at);
}

export async function createOrUpdateLoyverseCustomer(input: Omit<LoyverseCustomer, "id"> & { id?: string }) {
  return loyverseFetch<LoyverseCustomer>("/customers", { method: "POST", body: JSON.stringify(input) });
}

export async function findOrCreateLoyverseCustomer(input: {
  name: string;
  email: string;
  phone?: string | null;
  address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postalCode?: string | null; country?: string | null } | null;
}) {
  const existing = await findLoyverseCustomerByEmail(input.email);
  if (existing) return existing;
  const address = [input.address?.line1, input.address?.line2].filter(Boolean).join(", ").slice(0, 192);
  return createOrUpdateLoyverseCustomer({
    name: input.name.slice(0, 64),
    email: input.email.slice(0, 100),
    phone_number: input.phone?.replace(/[^+\d]/g, "").slice(0, 15) || undefined,
    address: address || undefined,
    city: input.address?.city?.slice(0, 64) || undefined,
    region: input.address?.state?.slice(0, 64) || undefined,
    postal_code: input.address?.postalCode?.slice(0, 20) || undefined,
    country_code: input.address?.country?.slice(0, 2).toUpperCase() || undefined,
    note: "Created from the Aurum Privée online store",
  });
}

export async function createLoyverseReceipt(input: {
  orderNumber: string;
  customerName?: string;
  customerId?: string;
  moneyAmount: number;
  lines: Array<{ variantId: string; quantity: number; price: number; taxIds?: string[] }>;
  note?: string;
}) {
  const storeId = process.env.LOYVERSE_STORE_ID;
  const paymentTypeId = process.env.LOYVERSE_PAYMENT_TYPE_ID;
  if (!storeId || !paymentTypeId) throw new Error("Loyverse receipt settings are incomplete");

  return loyverseFetch<LoyverseReceipt>("/receipts", {
    method: "POST",
    body: JSON.stringify({
      order: input.orderNumber,
      source: "Aurum Privée Online",
      note: input.note || `Online order${input.customerName ? ` for ${input.customerName}` : ""}`,
      store_id: storeId,
      customer_id: input.customerId,
      line_items: input.lines.map((line) => ({
        variant_id: line.variantId,
        quantity: line.quantity,
        price: line.price,
        line_taxes: (line.taxIds || []).map((id) => ({ id })),
      })),
      payments: [{ payment_type_id: paymentTypeId, money_amount: input.moneyAmount, paid_at: new Date().toISOString() }],
    }),
  });
}

function receiptLookupPath(createdAt?: string) {
  if (!createdAt) return "/receipts";
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return "/receipts";
  const query = new URLSearchParams({ created_at_min: new Date(timestamp - 48 * 60 * 60 * 1000).toISOString() });
  return `/receipts?${query}`;
}

export async function listLoyverseReceiptsByOrder(orderNumber: string, createdAt?: string) {
  const receipts = await listPaginated<LoyverseReceipt>(receiptLookupPath(createdAt), "receipts");
  return receipts.filter((receipt) => receipt.order === orderNumber);
}

export async function findLoyverseReceiptByOrder(orderNumber: string, createdAt?: string) {
  const receipts = await listLoyverseReceiptsByOrder(orderNumber, createdAt);
  return receipts.find((receipt) => receipt.receipt_type !== "REFUND" && !receipt.cancelled_at);
}

export async function getLoyverseReceipt(receiptNumber: string) {
  return loyverseFetch<LoyverseReceipt>(`/receipts/${encodeURIComponent(receiptNumber)}`);
}

export async function createLoyverseFullRefund(receipt: LoyverseReceipt) {
  const storeId = process.env.LOYVERSE_STORE_ID;
  if (!storeId) throw new Error("LOYVERSE_STORE_ID is required for refund synchronization");
  const lineItems = (receipt.line_items || []).filter((line) => line.quantity > 0).map((line) => ({ id: line.id, quantity: line.quantity }));
  if (!lineItems.length) throw new Error(`Loyverse receipt ${receipt.receipt_number} has no refundable line items`);
  return loyverseFetch<LoyverseReceipt>(`/receipts/${encodeURIComponent(receipt.receipt_number)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      source: "Aurum Privée Online",
      receipt_date: new Date().toISOString(),
      store_id: storeId,
      line_items: lineItems,
    }),
  });
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

// Loyverse OAuth webhooks use lowercase hex HMAC-SHA1 over the exact raw body.
export function verifyLoyverseSignature(rawBody: string, signature: string | null) {
  const clientSecret = process.env.LOYVERSE_CLIENT_SECRET;
  if (!clientSecret || !signature) return false;
  const expected = crypto.createHmac("sha1", clientSecret).update(rawBody, "utf8").digest("hex");
  return secureCompare(expected, signature.toLowerCase());
}

export function authenticateLoyverseWebhook(rawBody: string, signature: string | null, token: string | null) {
  const mode = process.env.LOYVERSE_WEBHOOK_AUTH_MODE || (process.env.LOYVERSE_CLIENT_SECRET ? "oauth" : "token");
  if (mode === "oauth") return verifyLoyverseSignature(rawBody, signature);
  const expectedToken = process.env.LOYVERSE_WEBHOOK_TOKEN;
  return Boolean(isStrongSecret(expectedToken) && token && secureCompare(expectedToken, token));
}

export function getLoyverseWebhookUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl || !siteUrl.startsWith("https://")) throw new Error("NEXT_PUBLIC_SITE_URL must be a public HTTPS URL before registering Loyverse webhooks");
  const url = new URL("/api/loyverse/webhook", siteUrl);
  const mode = process.env.LOYVERSE_WEBHOOK_AUTH_MODE || (process.env.LOYVERSE_CLIENT_SECRET ? "oauth" : "token");
  if (mode === "token") {
    const token = process.env.LOYVERSE_WEBHOOK_TOKEN;
    if (!isStrongSecret(token)) throw new Error("LOYVERSE_WEBHOOK_TOKEN must contain at least 32 characters for personal access token webhooks");
    url.searchParams.set("token", token);
  }
  return url.toString();
}
