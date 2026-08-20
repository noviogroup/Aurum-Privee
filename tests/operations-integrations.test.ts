import assert from "node:assert/strict";
import test from "node:test";
import { buildConfigurationReadiness } from "@/lib/operations-integrations";

const catalog = { all: 734, loyverse: 659, curated: 0, missing: 75 };

function strong(label: string) {
  return `${label}-${"x".repeat(40)}`;
}

test("readiness never exposes configured secret values", () => {
  const accessToken = strong("private-loyverse-token");
  const serviceRole = strong("private-service-role");
  const result = buildConfigurationReadiness({
    NEXT_PUBLIC_SITE_URL: "https://shop.lolalily.com",
    NEXT_PUBLIC_CHECKOUT_ENABLED: "false",
    NEXT_PUBLIC_STORE_CURRENCY: "BSD",
    LOYVERSE_ACCESS_TOKEN: accessToken,
    LOYVERSE_MERCHANT_ID: "merchant-id",
    LOYVERSE_STORE_ID: "store-id",
    LOYVERSE_PAYMENT_TYPE_ID: "payment-id",
    LOYVERSE_DELIVERY_VARIANT_ID: "delivery-id",
    LOYVERSE_WEBHOOK_TOKEN: strong("webhook"),
    LOYVERSE_CREDENTIALS_ROTATED: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    STRIPE_SECRET_KEY: "sk_live_private",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_public",
    STRIPE_WEBHOOK_SECRET: strong("stripe-webhook"),
    RESEND_API_KEY: "re_private",
    RESEND_FROM_EMAIL: "Lola Lily <orders@lolalily.com>",
    STORE_NOTIFICATION_EMAIL: "orders@lolalily.com",
    SYNC_SECRET: strong("sync"),
    RATE_LIMIT_SECRET: strong("rate"),
    HEALTH_MONITOR_SECRET: strong("health"),
    OPERATIONS_SESSION_SECRET: strong("session"),
    OPERATIONS_PASSWORD: strong("password"),
  }, catalog, "2026-08-12T12:00:00.000Z");

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(accessToken), false);
  assert.equal(serialized.includes(serviceRole), false);
  assert.equal(serialized.includes("sk_live_private"), false);
  assert.equal(result.total, 6);
  assert.equal(result.services.find((item) => item.id === "domain")?.state, "ready");
  assert.equal(result.services.find((item) => item.id === "security")?.state, "ready");
  assert.equal(result.services.find((item) => item.id === "payments")?.facts.some((fact) => fact.label === "Checkout" && fact.value === "Launch switch off"), true);
  assert.equal(result.services.find((item) => item.id === "payments")?.requirements.some((item) => item.includes("NEXT_PUBLIC_CHECKOUT_ENABLED=true")), true);
});

test("local unconfigured environment reports actionable launch gaps", () => {
  const result = buildConfigurationReadiness({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, catalog);
  assert.equal(result.ready, 0);
  assert.equal(result.live, false);
  assert.equal(result.services.find((item) => item.id === "loyverse")?.status, "Needs setup");
  assert.equal(result.services.find((item) => item.id === "database")?.requirements.includes("Apply all fourteen migrations"), true);
  assert.equal(result.services.find((item) => item.id === "domain")?.status, "Local only");
  assert.equal(result.services.find((item) => item.id === "security")?.state, "attention");
});

test("configuration readiness classifies partial Loyverse setup without claiming live readiness", () => {
  const result = buildConfigurationReadiness({
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    LOYVERSE_ACCESS_TOKEN: strong("token"),
    LOYVERSE_MERCHANT_ID: "merchant-id",
    LOYVERSE_STORE_ID: "store-id",
    LOYVERSE_PAYMENT_TYPE_ID: "payment-id",
    LOYVERSE_WEBHOOK_TOKEN: strong("webhook"),
  }, catalog);
  const loyverse = result.services.find((item) => item.id === "loyverse");
  assert.equal(loyverse?.state, "attention");
  assert.equal(loyverse?.requirements.some((item) => item.includes("New Providence Delivery")), true);
  assert.equal(loyverse?.requirements.includes("Rotate the access token"), true);
  assert.deepEqual(loyverse?.facts.find((fact) => fact.label === "Images")?.value, "659 sourced / 75 missing");
});
