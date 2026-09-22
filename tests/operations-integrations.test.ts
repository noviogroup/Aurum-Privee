import assert from "node:assert/strict";
import test from "node:test";
import { buildConfigurationReadiness, wixLiveCheckFailureRequirements } from "@/lib/operations-integrations";

const catalog = { all: 734, loyverse: 659, curated: 0, missing: 75 };

function strong(label: string) {
  return `${label}-${"x".repeat(40)}`;
}

test("readiness never exposes configured secret values", () => {
  const accessToken = strong("private-loyverse-token");
  const serviceRole = strong("private-service-role");
  const result = buildConfigurationReadiness({
    NEXT_PUBLIC_SITE_URL: "https://aurum-privee.example",
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
    RESEND_FROM_EMAIL: "Aurum Privée <orders@aurum-privee.example>",
    STORE_NOTIFICATION_EMAIL: "orders@aurum-privee.example",
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

test("local unconfigured environment reports launch gaps while storage needs no setup", () => {
  const result = buildConfigurationReadiness({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, catalog);
  assert.equal(result.ready, 1);
  assert.equal(result.live, false);
  assert.equal(result.services.find((item) => item.id === "loyverse")?.status, "Needs setup");
  assert.equal(result.services.find((item) => item.id === "database")?.connection, "Netlify Blobs · zero configuration");
  assert.deepEqual(result.services.find((item) => item.id === "database")?.requirements, []);
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

test("Wix commerce readiness reports the selected hosted checkout instead of legacy Stripe", () => {
  const result = buildConfigurationReadiness({
    COMMERCE_PROVIDER: "wix",
    NEXT_PUBLIC_WIX_CLIENT_ID: "wix-client-id",
    WIX_API_KEY: "wix-server-api-key",
    WIX_SITE_ID: "7cdfe7ac-5427-4d9f-b8bb-53e568ca63bd",
    WIX_STOREFRONT_ORIGIN: "https://aurumprivee.com",
    WIX_CATALOG_VERSION: "v3",
    WIX_EXPECTED_SKU_COUNT: "733",
    WIX_CHECKOUT_ENABLED: "false",
    NEXT_PUBLIC_CHECKOUT_ENABLED: "false",
    NEXT_PUBLIC_STORE_CURRENCY: "BSD",
  }, catalog);

  const payments = result.services.find((item) => item.id === "payments");
  const loyverse = result.services.find((item) => item.id === "loyverse");
  assert.equal(payments?.connection, "Wix Hosted Checkout selected");
  assert.equal(payments?.status, "Acceptance gated");
  assert.equal(payments?.facts.some((fact) => fact.label === "Provider" && fact.value === "Wix Hosted Checkout"), true);
  assert.equal(payments?.requirements.some((item) => item.includes("WIX_CHECKOUT_ENABLED=true")), true);
  assert.equal(payments?.requirements.some((item) => item.includes("Bahamas acquiring provider")), false);
  assert.equal(loyverse?.status, "Standby");
  assert.deepEqual(loyverse?.requirements, []);
});

test("a failed Wix live check preserves the known launch gates", () => {
  const requirements = wixLiveCheckFailureRequirements([
    "Set WIX_CHECKOUT_ENABLED=true after checkout acceptance",
    "Set NEXT_PUBLIC_CHECKOUT_ENABLED=true after checkout acceptance",
  ]);

  assert.deepEqual(requirements, [
    "Set WIX_CHECKOUT_ENABLED=true after checkout acceptance",
    "Set NEXT_PUBLIC_CHECKOUT_ENABLED=true after checkout acceptance",
    "Retry the live Wix catalogue and order-verification checks from the deployed environment",
  ]);
  assert.equal(requirements.some((item) => item.includes("Confirm the Wix client")), false);
});

test("security readiness requires the independent scheduled-worker secrets", () => {
  const result = buildConfigurationReadiness({
    RATE_LIMIT_SECRET: strong("rate"),
    OPERATIONS_SESSION_SECRET: strong("session"),
    OPERATIONS_PASSWORD: strong("password"),
  }, catalog);

  const security = result.services.find((item) => item.id === "security");
  assert.equal(security?.state, "attention");
  assert.deepEqual(security?.requirements, [
    "Configure an independent sync-worker secret",
    "Configure an independent health-monitor secret",
  ]);
  assert.equal(security?.facts.some((fact) => fact.label === "Recovery workers" && fact.value === "Needs sync secret"), true);
  assert.equal(security?.facts.some((fact) => fact.label === "Health monitor" && fact.value === "Needs monitor secret"), true);
});

test("email readiness reports only the settings that are actually missing", () => {
  const result = buildConfigurationReadiness({
    RESEND_API_KEY: "re_restricted_key",
    RESEND_FROM_EMAIL: "Aurum Privée <care@aurumprivee.com>",
    RESEND_DOMAIN_VERIFIED: "true",
  }, catalog);

  const email = result.services.find((item) => item.id === "email");
  assert.deepEqual(email?.requirements, ["Set STORE_NOTIFICATION_EMAIL to a real monitored inbox"]);
});
