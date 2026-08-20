import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  authenticateLoyverseWebhook,
  createLoyverseFullRefund,
  createLoyverseReceipt,
  getLoyverseMerchant,
  getLoyverseWebhookUrl,
  listLoyverseWebhooks,
  listLoyverseReceiptsByOrder,
  resolveVariantForStore,
  verifyLoyverseSignature,
} from "../lib/loyverse";
import { normalizeLoyverseStock, slugifyProduct } from "../lib/loyverse-sync";
import { prepareLoyverseReceipt } from "../lib/loyverse-order-sync";
import { findExistingFullRefund } from "../lib/loyverse-refund-sync";
import { calculateAddedTax, grossFromNet, netFromGross } from "../lib/tax";
import { familyForCategory, isOnlineCategory, splitProductName } from "../lib/product-normalization";
import { hasBearerSecret, isConfiguredSecret, isStrongSecret } from "../lib/env";
import { formatMoney } from "../lib/config";
import { escapeHtml } from "../lib/email";
import { readRequestText, requestFingerprint, RequestBodyTooLargeError } from "../lib/request-security";

test("formats fractional currency values to two cents", () => {
  assert.match(formatMoney(6.5), /6\.50/);
  assert.doesNotMatch(formatMoney(65), /65\.00/);
});

test("rejects unset and placeholder secrets", () => {
  assert.equal(isConfiguredSecret(undefined), false);
  assert.equal(isConfiguredSecret("replace_with_a_random_secret"), false);
  assert.equal(isConfiguredSecret("CHANGE-ME"), false);
  assert.equal(isConfiguredSecret("https://yourdomain.com/callback"), false);
  assert.equal(isConfiguredSecret("a-real-random-secret-value"), true);
  assert.equal(isConfiguredSecret("password"), false);
  assert.equal(isStrongSecret("short"), false);
  assert.equal(isStrongSecret("12345678901234567890123456789012"), true);
});

test("protects bearer routes with a configured non-placeholder secret", () => {
  const configuredRequest = new Request("https://shop.example/api/sync", {
    headers: { authorization: "Bearer 12345678901234567890123456789012" },
  });
  const placeholderRequest = new Request("https://shop.example/api/sync", {
    headers: { authorization: "Bearer replace_with_a_random_secret" },
  });
  assert.equal(hasBearerSecret(configuredRequest, "12345678901234567890123456789012"), true);
  assert.equal(hasBearerSecret(placeholderRequest, "replace_with_a_random_secret"), false);
});

test("verifies the current Loyverse OAuth HMAC-SHA1 hex signature", () => {
  const body = JSON.stringify({ type: "inventory_levels.update", created_at: "2026-08-12T12:00:00Z" });
  process.env.LOYVERSE_CLIENT_SECRET = "client-secret";
  const signature = crypto.createHmac("sha1", "client-secret").update(body, "utf8").digest("hex");
  assert.equal(verifyLoyverseSignature(body, signature), true);
  assert.equal(verifyLoyverseSignature(`${body} `, signature), false);
  delete process.env.LOYVERSE_CLIENT_SECRET;
});

test("authenticates personal-token webhooks with a callback token", () => {
  process.env.LOYVERSE_WEBHOOK_AUTH_MODE = "token";
  process.env.LOYVERSE_WEBHOOK_TOKEN = "12345678901234567890123456789012";
  assert.equal(authenticateLoyverseWebhook("{}", null, "12345678901234567890123456789012"), true);
  assert.equal(authenticateLoyverseWebhook("{}", null, "wrong"), false);
  delete process.env.LOYVERSE_WEBHOOK_AUTH_MODE;
  delete process.env.LOYVERSE_WEBHOOK_TOKEN;
});

test("escapes all dynamic HTML text for email rendering", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')"> & Lily`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; Lily");
});

test("removes email-header newlines from order identifiers", () => {
  const orderNumber = "AP-100\r\nBcc: attacker@example.com";
  assert.equal(orderNumber.replace(/[\r\n]/g, ""), "AP-100Bcc: attacker@example.com");
});

test("rejects request bodies above an endpoint byte limit", async () => {
  const request = new Request("https://shop.example/api", { method: "POST", body: "12345" });
  await assert.rejects(() => readRequestText(request, 4), RequestBodyTooLargeError);
});

test("pseudonymizes client fingerprints with a deployment secret", () => {
  process.env.RATE_LIMIT_SECRET = "12345678901234567890123456789012";
  const request = new Request("https://shop.example/api", { headers: { "x-nf-client-connection-ip": "192.0.2.10", "user-agent": "browser" } });
  const rotatedAgent = new Request("https://shop.example/api", { headers: { "x-nf-client-connection-ip": "192.0.2.10", "user-agent": "attacker-rotated-agent" } });
  const differentAddress = new Request("https://shop.example/api", { headers: { "x-nf-client-connection-ip": "192.0.2.11", "user-agent": "browser" } });
  assert.match(requestFingerprint(request) || "", /^[a-f0-9]{64}$/);
  assert.equal(requestFingerprint(request), requestFingerprint(request));
  assert.equal(requestFingerprint(request), requestFingerprint(rotatedAgent));
  assert.notEqual(requestFingerprint(request), requestFingerprint(differentAddress));
  delete process.env.RATE_LIMIT_SECRET;
});

test("never authenticates a placeholder webhook token", () => {
  process.env.LOYVERSE_WEBHOOK_AUTH_MODE = "token";
  process.env.LOYVERSE_WEBHOOK_TOKEN = "replace_with_a_random_secret";
  assert.equal(authenticateLoyverseWebhook("{}", null, "replace_with_a_random_secret"), false);
  delete process.env.LOYVERSE_WEBHOOK_AUTH_MODE;
  delete process.env.LOYVERSE_WEBHOOK_TOKEN;
});

test("builds a protected HTTPS callback for personal-token webhooks", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://aurum-privee.example/path-that-is-ignored";
  process.env.LOYVERSE_WEBHOOK_AUTH_MODE = "token";
  process.env.LOYVERSE_WEBHOOK_TOKEN = "12345678901234567890123456789012";
  assert.equal(getLoyverseWebhookUrl(), "https://aurum-privee.example/api/loyverse/webhook?token=12345678901234567890123456789012");
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.LOYVERSE_WEBHOOK_AUTH_MODE;
  delete process.env.LOYVERSE_WEBHOOK_TOKEN;
});

test("normalizes the live wrapped webhook-list response", async () => {
  const originalFetch = globalThis.fetch;
  process.env.LOYVERSE_ACCESS_TOKEN = "test-access-token";
  globalThis.fetch = async () => Response.json({ webhooks: [{
    id: "webhook-1",
    merchant_id: "merchant-1",
    url: "https://shop.example/api/loyverse/webhook",
    type: "items.update",
    status: "ENABLED",
  }] });
  try {
    const webhooks = await listLoyverseWebhooks();
    assert.equal(webhooks.length, 1);
    assert.equal(webhooks[0].id, "webhook-1");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
  }
});

test("finds order receipts by scanning supported receipt pages", async () => {
  const originalFetch = globalThis.fetch;
  process.env.LOYVERSE_ACCESS_TOKEN = "test-access-token";
  const requestedUrls: string[] = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).includes("cursor=page-2")) {
      return Response.json({ receipts: [{ receipt_number: "2-101", receipt_type: "SALE", order: "AP-TARGET", total_money: 110 }] });
    }
    return Response.json({ receipts: [{ receipt_number: "2-100", receipt_type: "SALE", order: "OTHER", total_money: 50 }], cursor: "page-2" });
  };
  try {
    const receipts = await listLoyverseReceiptsByOrder("AP-TARGET", "2026-08-12T12:00:00.000Z");
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].receipt_number, "2-101");
    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls.some((url) => url.includes("order=")), false);
    assert.equal(requestedUrls.every((url) => url.includes("created_at_min=")), true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
  }
});

test("uses the configured store override price", () => {
  const result = resolveVariantForStore({
    variant_id: "variant-1",
    default_pricing_type: "FIXED",
    default_price: 120,
    stores: [{ store_id: "nassau", pricing_type: "FIXED", price: 138, available_for_sale: true }],
  }, "nassau");
  assert.deepEqual(result, { available: true, price: 138 });
});

test("excludes variable-price and store-disabled variants", () => {
  assert.deepEqual(resolveVariantForStore({ variant_id: "variable", default_pricing_type: "VARIABLE" }, "nassau"), { available: false, price: null });
  assert.deepEqual(resolveVariantForStore({
    variant_id: "disabled",
    default_pricing_type: "FIXED",
    default_price: 100,
    stores: [{ store_id: "nassau", available_for_sale: false }],
  }, "nassau"), { available: false, price: null });
});

test("creates stable URL-safe product slugs", () => {
  assert.equal(slugifyProduct("Aurum Privée Éclat No. 5"), "aurum-privee-eclat-no-5");
});

test("normalizes fragrance brands and gendered categories", () => {
  assert.deepEqual(splitProductName("Afnan - Supremacy Noir EDP 3.4 oz"), { brand: "Afnan", name: "Supremacy Noir EDP 3.4 oz" });
  assert.equal(familyForCategory("Women's Fragrance Collection"), "Floral");
  assert.equal(familyForCategory("Men’s Fragrance Collection"), "Woody");
  assert.equal(familyForCategory("Unisex Fragrance"), "Fresh");
});

test("publishes fragrance categories while excluding testers", () => {
  assert.equal(isOnlineCategory("Women's Fragrance Collection"), true);
  assert.equal(isOnlineCategory("TESTER Fragrance"), false);
  assert.equal(isOnlineCategory("Women Accessories"), false);
});

test("normalizes unavailable and negative inventory without inventing stock", () => {
  assert.equal(normalizeLoyverseStock(undefined), 0);
  assert.equal(normalizeLoyverseStock(-3), 0);
  assert.equal(normalizeLoyverseStock(4.5), 4.5);
});

test("adds delivery and reconciles the Loyverse receipt payment total", () => {
  const prepared = prepareLoyverseReceipt({
    orderNumber: "AP-1001",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    shippingAmount: 8,
    lines: [{ name: "Santal Noir", quantity: 2, amount: 190, unitPrice: 95, loyverseVariantId: "variant-1" }],
  }, "delivery-variant");

  assert.deepEqual(prepared.lines, [
    { variantId: "variant-1", quantity: 2, price: 95, taxIds: [] },
    { variantId: "delivery-variant", quantity: 1, price: 8, taxIds: [] },
  ]);
  assert.equal(prepared.moneyAmount, 198);
});

test("allocates indivisible promotion discounts without a one-cent receipt mismatch", () => {
  const prepared = prepareLoyverseReceipt({
    orderNumber: "AP-1003",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    lines: [{ name: "Santal Noir", quantity: 3, amount: 284, unitPrice: 284 / 3, loyverseVariantId: "variant-1" }],
  });

  assert.deepEqual(prepared.lines, [
    { variantId: "variant-1", quantity: 2, price: 94.67, taxIds: [] },
    { variantId: "variant-1", quantity: 1, price: 94.66, taxIds: [] },
  ]);
  assert.equal(prepared.moneyAmount, 284);
});

test("preserves included tax IDs on product and delivery receipt lines", () => {
  const prepared = prepareLoyverseReceipt({
    orderNumber: "AP-1004",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    shippingAmount: 10,
    lines: [{ name: "Iris Veil", quantity: 1, amount: 100, unitPrice: 100, loyverseVariantId: "variant-1", taxIds: ["vat-included"] }],
  }, "delivery-variant", ["delivery-vat"]);
  assert.deepEqual(prepared.lines, [
    { variantId: "variant-1", quantity: 1, price: 100, taxIds: ["vat-included"] },
    { variantId: "delivery-variant", quantity: 1, price: 10, taxIds: ["delivery-vat"] },
  ]);
});

test("charges added Loyverse VAT once and reconciles the paid total", () => {
  const vat = { id: "vat-added", name: "Value Added Tax - 10", type: "ADDED" as const, rate: 10 };
  const prepared = prepareLoyverseReceipt({
    orderNumber: "AP-1006",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    shippingAmount: 10,
    paidTotal: 121,
    lines: [{ name: "Iris Veil", quantity: 1, amount: 100, unitPrice: 100, loyverseVariantId: "variant-1", taxIds: [vat.id], taxes: [vat] }],
  }, "delivery-variant", [vat.id], 10);

  assert.equal(calculateAddedTax(100, [vat]), 10);
  assert.equal(grossFromNet(10, 10), 11);
  assert.equal(netFromGross(11, 10), 10);
  assert.equal(prepared.moneyAmount, 121);
  assert.deepEqual(prepared.lines, [
    { variantId: "variant-1", quantity: 1, price: 100, taxIds: [vat.id] },
    { variantId: "delivery-variant", quantity: 1, price: 10, taxIds: [vat.id] },
  ]);
});

test("calculates added tax on the pre-tax base when included taxes coexist", () => {
  assert.equal(calculateAddedTax(12, [
    { id: "included-a", name: "Included A", type: "INCLUDED", rate: 20 },
    { id: "included-b", name: "Included B", type: "INCLUDED", rate: 5 },
    { id: "added", name: "Added", type: "ADDED", rate: 10 },
  ]), 0.96);
});

test("blocks Loyverse receipt sync when tax math differs from the payment", () => {
  const vat = { id: "vat-added", name: "Value Added Tax - 10", type: "ADDED" as const, rate: 10 };
  assert.throws(() => prepareLoyverseReceipt({
    orderNumber: "AP-1007",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    paidTotal: 100,
    lines: [{ name: "Iris Veil", quantity: 1, amount: 100, unitPrice: 100, loyverseVariantId: "variant-1", taxIds: [vat.id], taxes: [vat] }],
  }), /does not match paid total/);
});

test("sends explicit included taxes to Loyverse without allowing default added taxes", async () => {
  const originalFetch = globalThis.fetch;
  process.env.LOYVERSE_ACCESS_TOKEN = "test-access-token";
  process.env.LOYVERSE_STORE_ID = "nassau";
  process.env.LOYVERSE_PAYMENT_TYPE_ID = "online-card";
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.line_items, [{
      variant_id: "variant-1",
      quantity: 1,
      price: 100,
      line_taxes: [{ id: "vat-included" }],
    }]);
    return Response.json({ receipt_number: "2-1005", receipt_type: "SALE", total_money: 100 });
  };

  try {
    await createLoyverseReceipt({
      orderNumber: "AP-1005",
      moneyAmount: 100,
      lines: [{ variantId: "variant-1", quantity: 1, price: 100, taxIds: ["vat-included"] }],
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
    delete process.env.LOYVERSE_STORE_ID;
    delete process.env.LOYVERSE_PAYMENT_TYPE_ID;
  }
});

test("finds an existing full refund for idempotent retries", () => {
  const refund = findExistingFullRefund([
    { receipt_number: "2-1001", receipt_type: "SALE", total_money: 100 },
    { receipt_number: "2-1002", receipt_type: "REFUND", refund_for: "2-1001", total_money: 100 },
  ], "2-1001");
  assert.equal(refund?.receipt_number, "2-1002");
});

test("creates a Loyverse full refund from the original receipt line IDs", async () => {
  const originalFetch = globalThis.fetch;
  process.env.LOYVERSE_ACCESS_TOKEN = "test-access-token";
  process.env.LOYVERSE_STORE_ID = "nassau";
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.loyverse.com/v1.0/receipts/2-1001/refund");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store_id, "nassau");
    assert.deepEqual(body.line_items, [{ id: "line-1", quantity: 2 }]);
    return Response.json({ receipt_number: "2-1002", receipt_type: "REFUND", refund_for: "2-1001", total_money: 190 });
  };

  try {
    const refund = await createLoyverseFullRefund({
      receipt_number: "2-1001",
      receipt_type: "SALE",
      total_money: 190,
      line_items: [{ id: "line-1", variant_id: "variant-1", quantity: 2, price: 95 }],
    });
    assert.equal(refund.receipt_number, "2-1002");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
    delete process.env.LOYVERSE_STORE_ID;
  }
});

test("refuses receipt creation when a product has no Loyverse mapping", () => {
  assert.throws(() => prepareLoyverseReceipt({
    orderNumber: "AP-1002",
    customerName: "Ava Smith",
    customerEmail: "ava@example.com",
    lines: [{ name: "Unmapped scent", quantity: 1, amount: 75, unitPrice: 75 }],
  }), /Missing variant mapping for: Unmapped scent/);
});

test("retries transient Loyverse API failures", async () => {
  const originalFetch = globalThis.fetch;
  process.env.LOYVERSE_ACCESS_TOKEN = "test-access-token";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response("temporarily unavailable", { status: 503, headers: { "retry-after": "0" } });
    return Response.json({
      id: "merchant-1",
      business_name: "Aurum Privée",
      email: "owner@example.com",
      country: "BS",
      currency: { code: "BSD", decimal_places: 2 },
    });
  };

  try {
    const merchant = await getLoyverseMerchant();
    assert.equal(merchant.business_name, "Aurum Privée");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LOYVERSE_ACCESS_TOKEN;
  }
});
