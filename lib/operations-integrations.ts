import Stripe from "stripe";
import { Resend } from "resend";
import { isConfiguredSecret, isStrongSecret } from "@/lib/env";
import {
  getLoyverseMerchant,
  getLoyverseVariant,
  listLoyversePaymentTypes,
  listLoyverseStores,
  resolveVariantForStore,
} from "@/lib/loyverse";
import { getOperationsImageCatalog } from "@/lib/operations-images";
import type { IntegrationId, OperationsIntegration, OperationsReadiness } from "@/lib/operations-integration-types";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deliveryItemRequirement, expectedLoyverseBusinessName, loyverseBusinessNameMatches } from "@/lib/loyverse-readiness";
import { checkoutIsEnabled } from "@/lib/checkout-availability";

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;
type CatalogTotals = { all: number; loyverse: number; missing: number; curated: number };

function publicHost(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ? url.hostname : null;
  } catch {
    return null;
  }
}

function configuredPayment(env: Environment) {
  return isConfiguredSecret(env.STRIPE_SECRET_KEY)
    && isConfiguredSecret(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    && isConfiguredSecret(env.STRIPE_WEBHOOK_SECRET);
}

function configuredEmail(env: Environment) {
  return isConfiguredSecret(env.RESEND_API_KEY)
    && isConfiguredSecret(env.RESEND_FROM_EMAIL)
    && isConfiguredSecret(env.STORE_NOTIFICATION_EMAIL);
}

function configuredLoyverse(env: Environment) {
  return isConfiguredSecret(env.LOYVERSE_ACCESS_TOKEN)
    && isConfiguredSecret(env.LOYVERSE_MERCHANT_ID)
    && isConfiguredSecret(env.LOYVERSE_STORE_ID)
    && isConfiguredSecret(env.LOYVERSE_PAYMENT_TYPE_ID);
}

function configuredSecurity(env: Environment) {
  return isStrongSecret(env.RATE_LIMIT_SECRET)
    && isStrongSecret(env.OPERATIONS_SESSION_SECRET)
    && isStrongSecret(env.OPERATIONS_PASSWORD, 12);
}

function service(input: OperationsIntegration) {
  return input;
}

export function buildConfigurationReadiness(env: Environment, catalog: CatalogTotals, checkedAt = new Date().toISOString()): OperationsReadiness {
  const host = publicHost(env.NEXT_PUBLIC_SITE_URL);
  const securityReady = configuredSecurity(env);
  const loyverseConfigured = configuredLoyverse(env);
  const paymentConfigured = configuredPayment(env);
  const checkoutEnabled = checkoutIsEnabled(env.NEXT_PUBLIC_CHECKOUT_ENABLED);
  const emailConfigured = configuredEmail(env);
  const deliveryConfigured = isConfiguredSecret(env.LOYVERSE_DELIVERY_VARIANT_ID);
  const credentialsRotated = env.LOYVERSE_CREDENTIALS_ROTATED === "true";
  const expectedBusiness = expectedLoyverseBusinessName(env);

  const services: OperationsIntegration[] = [
    service({
      id: "loyverse",
      name: "Loyverse",
      summary: "Catalog, inventory, customers and receipts",
      state: loyverseConfigured && deliveryConfigured && credentialsRotated ? "attention" : loyverseConfigured ? "attention" : "missing",
      status: loyverseConfigured ? "Configured" : "Needs setup",
      connection: loyverseConfigured ? "Credentials present" : "Credentials missing",
      facts: [
        { label: "Business", value: loyverseConfigured ? `Expected ${expectedBusiness}` : "Not connected" },
        { label: "Store", value: isConfiguredSecret(env.LOYVERSE_STORE_ID) ? "Configured" : "Not selected" },
        { label: "Currency", value: env.NEXT_PUBLIC_STORE_CURRENCY || "BSD" },
        { label: "Catalog", value: `${catalog.all} products` },
        { label: "Images", value: `${catalog.loyverse + catalog.curated} sourced / ${catalog.missing} missing` },
        { label: "Inventory", value: "Checked live before checkout" },
      ],
      requirements: [
        ...(!credentialsRotated ? ["Rotate the access token"] : []),
        ...(!deliveryConfigured ? [deliveryItemRequirement()] : []),
      ],
    }),
    service({
      id: "database",
      name: "Commerce storage",
      summary: "Orders, webhook state, inquiries and subscriber consent",
      state: "ready",
      status: "Ready",
      connection: "Netlify Blobs · zero configuration",
      facts: [
        { label: "Store", value: "Site-scoped Netlify Blobs" },
        { label: "Consistency", value: "Strong reads for commerce state" },
        { label: "Credentials", value: "None required" },
      ],
      requirements: [],
    }),
    service({
      id: "payments",
      name: "Payments",
      summary: "Secure online checkout, callbacks and refunds",
      state: paymentConfigured ? "attention" : "missing",
      status: paymentConfigured ? "Configured" : "Needs provider",
      connection: paymentConfigured ? "Stripe credentials present" : "Provider not connected",
      facts: [
        { label: "Provider", value: paymentConfigured ? "Stripe Checkout" : "Not selected" },
        { label: "Mode", value: env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "Live" : paymentConfigured ? "Test" : "Not connected" },
        { label: "Checkout", value: checkoutEnabled ? "Open" : "Launch switch off" },
        { label: "Currency", value: env.NEXT_PUBLIC_STORE_CURRENCY || "BSD" },
      ],
      requirements: paymentConfigured
        ? ["Verify the live account and webhook callback", ...(!checkoutEnabled ? ["Set NEXT_PUBLIC_CHECKOUT_ENABLED=true only after acceptance testing"] : [])]
        : ["Select the Bahamas acquiring provider", "Provide sandbox credentials and callback signing rules", "Complete a payment and refund acceptance test"],
    }),
    service({
      id: "email",
      name: "Transactional email",
      summary: "Order, fulfillment and subscriber notifications",
      state: emailConfigured ? "attention" : "missing",
      status: emailConfigured ? "Configured" : "Needs setup",
      connection: emailConfigured ? "Resend credentials present" : "Resend not connected",
      facts: [
        { label: "Provider", value: "Resend" },
        { label: "Sending domain", value: emailConfigured ? "Run live checks" : "Not verified" },
        { label: "Messages", value: "Orders, fulfillment, newsletter" },
      ],
      requirements: emailConfigured ? ["Verify the sending domain and approved From address"] : ["Provide a Resend API key", "Verify the sending domain", "Confirm order notification recipients"],
    }),
    service({
      id: "domain",
      name: "Public domain",
      summary: "Website origin, DNS and HTTPS callbacks",
      state: host ? "ready" : "missing",
      status: host ? "Ready" : "Local only",
      connection: host ? "Public HTTPS configured" : "No public origin",
      facts: [
        { label: "Origin", value: host || "localhost:3000" },
        { label: "HTTPS", value: host ? "Required and configured" : "Available after deployment" },
        { label: "Callbacks", value: host ? "Can be registered" : "Waiting for domain" },
      ],
      requirements: host ? [] : ["Provide the final domain and DNS access", "Deploy to public HTTPS before registering webhooks"],
    }),
    service({
      id: "security",
      name: "Security & staff access",
      summary: "Protected operations, rate limits and signed sessions",
      state: securityReady ? "ready" : "attention",
      status: securityReady ? "Ready" : "Needs attention",
      connection: securityReady ? "Required secrets are strong" : "One or more controls need configuration",
      facts: [
        { label: "Staff console", value: isStrongSecret(env.OPERATIONS_PASSWORD, 12) ? "Protected" : "Needs password" },
        { label: "Sessions", value: isStrongSecret(env.OPERATIONS_SESSION_SECRET) ? "Signed, HttpOnly" : "Needs signing key" },
        { label: "API protection", value: isStrongSecret(env.RATE_LIMIT_SECRET) ? "Configured" : "Needs rate-limit secret" },
        { label: "Storage", value: "Private Netlify site scope" },
      ],
      requirements: securityReady ? [] : ["Configure independent high-entropy security secrets"],
    }),
  ];

  return { ready: services.filter((item) => item.state === "ready").length, total: services.length, live: false, checkedAt, services };
}

function updateService(readiness: OperationsReadiness, id: IntegrationId, patch: Partial<OperationsIntegration>) {
  readiness.services = readiness.services.map((item) => item.id === id ? { ...item, ...patch } : item);
}

function fromAddressDomain(value: string | undefined) {
  const match = value?.match(/@([^>\s]+)>?$/);
  return match?.[1]?.toLowerCase() || null;
}

export async function getOperationsReadiness({ live = false }: { live?: boolean } = {}): Promise<OperationsReadiness> {
  const catalog = await getOperationsImageCatalog();
  const readiness = buildConfigurationReadiness(process.env, catalog.totals);
  if (!live) return readiness;

  await Promise.all([
    (async () => {
      if (!configuredLoyverse(process.env)) return;
      try {
        const deliveryId = isConfiguredSecret(process.env.LOYVERSE_DELIVERY_VARIANT_ID) ? process.env.LOYVERSE_DELIVERY_VARIANT_ID : null;
        const [merchant, stores, paymentTypes, delivery] = await Promise.all([
          getLoyverseMerchant(), listLoyverseStores(), listLoyversePaymentTypes(),
          deliveryId ? getLoyverseVariant(deliveryId).catch(() => null) : Promise.resolve(null),
        ]);
        const store = stores.find((item) => item.id === process.env.LOYVERSE_STORE_ID);
        const payment = paymentTypes.find((item) => item.id === process.env.LOYVERSE_PAYMENT_TYPE_ID && (!store || item.stores.includes(store.id)));
        const deliveryReady = Boolean(delivery && store && resolveVariantForStore(delivery, store.id).available);
        const rotated = process.env.LOYVERSE_CREDENTIALS_ROTATED === "true";
        const expectedBusiness = expectedLoyverseBusinessName(process.env);
        const businessReady = loyverseBusinessNameMatches(merchant.business_name, expectedBusiness);
        const storeNameReady = Boolean(store && loyverseBusinessNameMatches(store.name, expectedBusiness));
        const requirements = [
          ...(!rotated ? ["Rotate the access token"] : []),
          ...(!businessReady ? [`Rename the Loyverse business from ‘${merchant.business_name}’ to ‘${expectedBusiness}’ or approve the existing legal name`] : []),
          ...(!store ? ["Select an accessible Loyverse store"] : []),
          ...(store && !storeNameReady ? [`Rename the Loyverse store from ‘${store.name}’ to ‘${expectedBusiness}’ or approve the existing operating name`] : []),
          ...(!payment ? ["Select an online payment type enabled for the store"] : []),
          ...(!deliveryReady ? [deliveryItemRequirement()] : []),
        ];
        updateService(readiness, "loyverse", {
          state: requirements.length ? "attention" : "ready",
          status: requirements.length ? "Action required" : "Ready",
          connection: "API reachable",
          facts: [
            { label: "Business", value: merchant.business_name },
            { label: "Store", value: store?.name || "Configured store not found" },
            { label: "Currency", value: merchant.currency.code },
            { label: "Catalog", value: `${catalog.totals.all} products` },
            { label: "Images", value: `${catalog.totals.loyverse + catalog.totals.curated} sourced / ${catalog.totals.missing} missing` },
            { label: "Inventory", value: "Checked live before checkout" },
          ],
          requirements,
        });
      } catch {
        updateService(readiness, "loyverse", { state: "error", status: "Check failed", connection: "API could not be reached", requirements: ["Confirm the rotated token and retry the live check"] });
      }
    })(),
    (async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) return;
      try {
        const [products, audit, emailRecovery, loyverseRecovery, buckets] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
          supabase.from("product_image_uploads").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("confirmation_email_status", { count: "exact", head: true }),
          supabase.from("orders").select("loyverse_sync_attempts,loyverse_sync_claimed_at,loyverse_refund_sync_attempts,loyverse_refund_sync_claimed_at", { count: "exact", head: true }),
          supabase.storage.listBuckets(),
        ]);
        if (products.error || audit.error || emailRecovery.error || loyverseRecovery.error || buckets.error) throw new Error("Supabase verification failed");
        const bucketReady = Boolean(buckets.data?.some((bucket) => bucket.id === "product-images" && bucket.public));
        updateService(readiness, "database", {
          state: bucketReady ? "ready" : "attention",
          status: bucketReady ? "Ready" : "Action required",
          connection: "Database reachable",
          facts: [
            { label: "Database", value: "Connected" },
            { label: "Active products", value: String(products.count || 0) },
            { label: "Image audit", value: `${audit.count || 0} curated uploads` },
            { label: "Email recovery", value: "Migration 013 ready" },
            { label: "Loyverse recovery", value: "Migration 014 ready" },
            { label: "Image bucket", value: bucketReady ? "Ready" : "Missing" },
          ],
          requirements: bucketReady ? [] : ["Apply migration 009 and verify the product-images bucket"],
        });
      } catch {
        updateService(readiness, "database", { state: "error", status: "Check failed", connection: "Database could not be verified", requirements: ["Confirm the project URL, service-role key and all fourteen migrations"] });
      }
    })(),
    (async () => {
      if (!configuredPayment(process.env)) return;
      try {
        const key = process.env.STRIPE_SECRET_KEY!;
        const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
        await stripe.balance.retrieve();
        const liveMode = key.startsWith("sk_live_");
        const checkoutEnabled = checkoutIsEnabled(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED);
        const paymentReady = liveMode && checkoutEnabled;
        updateService(readiness, "payments", {
          state: paymentReady ? "ready" : "attention",
          status: paymentReady ? "Ready" : liveMode ? "Launch disabled" : "Test mode",
          connection: "Payment API reachable",
          facts: [
            { label: "Adapter", value: "Stripe Checkout" },
            { label: "Mode", value: liveMode ? "Live" : "Test" },
            { label: "Checkout", value: checkoutEnabled ? "Open" : "Launch switch off" },
            { label: "Webhook", value: "Signing secret configured" },
            { label: "Currency", value: process.env.NEXT_PUBLIC_STORE_CURRENCY || "BSD" },
          ],
          requirements: [
            ...(!liveMode ? ["Complete acceptance tests, then install production credentials"] : []),
            ...(!checkoutEnabled ? ["Set NEXT_PUBLIC_CHECKOUT_ENABLED=true only after acceptance testing"] : []),
          ],
        });
      } catch {
        updateService(readiness, "payments", { state: "error", status: "Check failed", connection: "Payment API could not be reached", requirements: ["Confirm provider credentials and account status"] });
      }
    })(),
    (async () => {
      if (!configuredEmail(process.env)) return;
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const response = await resend.domains.list();
        if (response.error) throw new Error("Email verification failed");
        const domain = fromAddressDomain(process.env.RESEND_FROM_EMAIL);
        const entry = response.data?.data?.find((item) => item.name.toLowerCase() === domain);
        const verified = entry?.status === "verified";
        updateService(readiness, "email", {
          state: verified ? "ready" : "attention",
          status: verified ? "Ready" : "Domain unverified",
          connection: "Resend API reachable",
          facts: [
            { label: "Provider", value: "Resend" },
            { label: "Sending domain", value: domain || "Could not determine" },
            { label: "Domain status", value: entry?.status || "Not found" },
            { label: "Messages", value: "Orders, fulfillment, newsletter" },
          ],
          requirements: verified ? [] : ["Verify the configured sending domain in Resend"],
        });
      } catch {
        updateService(readiness, "email", { state: "error", status: "Check failed", connection: "Resend API could not be reached", requirements: ["Confirm the Resend key, domain and From address"] });
      }
    })(),
  ]);

  readiness.ready = readiness.services.filter((item) => item.state === "ready").length;
  readiness.live = true;
  readiness.checkedAt = new Date().toISOString();
  return readiness;
}
