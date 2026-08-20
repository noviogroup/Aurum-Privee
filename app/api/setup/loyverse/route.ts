import { NextResponse } from "next/server";
import {
  getLoyverseMerchant,
  getLoyverseVariant,
  getLoyverseWebhookUrl,
  listAllLoyverseItems,
  listLoyversePaymentTypes,
  listLoyverseStores,
  listLoyverseTaxes,
  listLoyverseWebhooks,
  LoyverseWebhook,
  LoyverseWebhookType,
  resolveVariantForStore,
  upsertLoyverseWebhook,
} from "@/lib/loyverse";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasBearerSecret, isConfiguredSecret, isStrongSecret } from "@/lib/env";
import { deliveryItemRequirement, expectedLoyverseBusinessName, loyverseBusinessNameMatches } from "@/lib/loyverse-readiness";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  return hasBearerSecret(request, process.env.SYNC_SECRET);
}

function sanitizeWebhook(webhook: LoyverseWebhook) {
  const url = new URL(webhook.url);
  if (url.searchParams.has("token")) url.searchParams.set("token", "[redacted]");
  return { ...webhook, url: url.toString() };
}

async function getOperationalStatus() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { databaseConfigured: false, error: "Supabase is not configured" };
  const [lastRun, failedOrders, pendingOrders, failedRefunds, manualRefunds, activeReservations, overdueReservations, failedWebhooks, lastWebhook] = await Promise.all([
    supabase.from("integration_runs").select("status,metrics,error,started_at,completed_at").eq("provider", "loyverse").eq("operation", "catalog_sync").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid").eq("loyverse_sync_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "partially_refunded", "refunded"]).in("loyverse_sync_status", ["pending", "processing"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_refund_sync_status", "failed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("loyverse_refund_sync_status", "manual_required"),
    supabase.from("checkout_reservations").select("id", { count: "exact", head: true }).eq("status", "active").gt("expires_at", new Date().toISOString()),
    supabase.from("checkout_reservations").select("id", { count: "exact", head: true }).eq("status", "active").lte("expires_at", new Date().toISOString()),
    supabase.from("loyverse_webhook_events").select("event_hash", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("loyverse_webhook_events").select("event_type,status,processed_at,error").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const error = lastRun.error || failedOrders.error || pendingOrders.error || failedRefunds.error || manualRefunds.error || activeReservations.error || overdueReservations.error || failedWebhooks.error || lastWebhook.error;
  if (error) return { databaseConfigured: true, error: error.message };
  return {
    databaseConfigured: true,
    lastCatalogSync: lastRun.data || null,
    failedOrderSyncs: failedOrders.count || 0,
    pendingOrderSyncs: pendingOrders.count || 0,
    failedRefundSyncs: failedRefunds.count || 0,
    manualRefundsRequired: manualRefunds.count || 0,
    activeCheckoutReservations: activeReservations.count || 0,
    overdueCheckoutReservations: overdueReservations.count || 0,
    failedWebhookEvents: failedWebhooks.count || 0,
    lastWebhookEvent: lastWebhook.data || null,
  };
}

async function getDiagnostics() {
  const deliveryVariantId = isConfiguredSecret(process.env.LOYVERSE_DELIVERY_VARIANT_ID) ? process.env.LOYVERSE_DELIVERY_VARIANT_ID : undefined;
  const [merchant, stores, paymentTypes, webhooks, deliveryVariant, items, taxes, operations] = await Promise.all([
    getLoyverseMerchant(),
    listLoyverseStores(),
    listLoyversePaymentTypes(),
    listLoyverseWebhooks(),
    deliveryVariantId ? getLoyverseVariant(deliveryVariantId).catch(() => null) : Promise.resolve(null),
    listAllLoyverseItems(),
    listLoyverseTaxes(),
    getOperationalStatus(),
  ]);
  const configuredStore = stores.find((store) => store.id === process.env.LOYVERSE_STORE_ID);
  const configuredPaymentType = paymentTypes.find((type) => type.id === process.env.LOYVERSE_PAYMENT_TYPE_ID);
  const expectedBusinessName = expectedLoyverseBusinessName(process.env);
  const issues: string[] = [];
  if (!isStrongSecret(process.env.SYNC_SECRET)) issues.push("SYNC_SECRET must contain at least 32 characters and cannot be a development placeholder");
  if (!isStrongSecret(process.env.RATE_LIMIT_SECRET)) issues.push("RATE_LIMIT_SECRET must contain at least 32 characters and cannot be a development placeholder");
  if (!process.env.LOYVERSE_MERCHANT_ID) issues.push("LOYVERSE_MERCHANT_ID is required to bind webhooks to this merchant");
  if (!configuredStore) issues.push("LOYVERSE_STORE_ID does not match an active Loyverse store");
  if (process.env.LOYVERSE_MERCHANT_ID && process.env.LOYVERSE_MERCHANT_ID !== merchant.id) issues.push("LOYVERSE_MERCHANT_ID does not match the connected merchant");
  if (!loyverseBusinessNameMatches(merchant.business_name, expectedBusinessName)) issues.push(`Loyverse business name ‘${merchant.business_name}’ does not match the approved storefront brand ‘${expectedBusinessName}’`);
  if (configuredStore && !loyverseBusinessNameMatches(configuredStore.name, expectedBusinessName)) issues.push(`Loyverse store name ‘${configuredStore.name}’ does not match the approved storefront brand ‘${expectedBusinessName}’`);
  if (!configuredPaymentType) issues.push("LOYVERSE_PAYMENT_TYPE_ID does not match an active payment type");
  if (configuredStore && configuredPaymentType && !configuredPaymentType.stores.includes(configuredStore.id)) issues.push("The configured payment type is not enabled for the configured store");
  if (!deliveryVariantId) issues.push(deliveryItemRequirement());
  else if (!deliveryVariant) issues.push("LOYVERSE_DELIVERY_VARIANT_ID does not match an accessible Loyverse variant");
  else if (!resolveVariantForStore(deliveryVariant, process.env.LOYVERSE_STORE_ID || "").available) issues.push("The configured delivery variant is not a fixed-price sale item at the configured store");
  const onlineItems = items.filter((item) => item.variants.some((variant) => variant.variant_id !== deliveryVariantId && resolveVariantForStore(variant, process.env.LOYVERSE_STORE_ID || "").available));
  const deliveryItem = items.find((item) => item.variants.some((variant) => variant.variant_id === deliveryVariantId));
  const appliedTaxIds = new Set([...onlineItems, ...(deliveryItem ? [deliveryItem] : [])].flatMap((item) => item.tax_ids || []));
  const appliedTaxes = taxes.filter((tax) => appliedTaxIds.has(tax.id));
  const missingTaxIds = [...appliedTaxIds].filter((id) => !taxes.some((tax) => tax.id === id));
  if (missingTaxIds.length) issues.push(`Some item tax IDs are not accessible: ${missingTaxIds.join(", ")}`);
  const configuredDeliveryTaxIds = (process.env.LOYVERSE_DELIVERY_TAX_IDS || "").split(",").map((id) => id.trim()).filter(Boolean).sort();
  const configuredDeliveryAddedTaxRate = Number(process.env.LOYVERSE_DELIVERY_ADDED_TAX_RATE || 0);
  if (!Number.isFinite(configuredDeliveryAddedTaxRate) || configuredDeliveryAddedTaxRate < 0) issues.push("LOYVERSE_DELIVERY_ADDED_TAX_RATE must be a non-negative number");
  if (deliveryItem) {
    const expectedDeliveryTaxIds = (deliveryItem.tax_ids || []).sort();
    if (expectedDeliveryTaxIds.join(",") !== configuredDeliveryTaxIds.join(",")) issues.push(`LOYVERSE_DELIVERY_TAX_IDS must match all taxes on the delivery item: ${expectedDeliveryTaxIds.join(",") || "none"}`);
    const deliveryTaxes = taxes.filter((tax) => expectedDeliveryTaxIds.includes(tax.id));
    const expectedDeliveryAddedTaxRate = deliveryTaxes.filter((tax) => tax.type === "ADDED").reduce((sum, tax) => sum + tax.rate, 0);
    if (Number.isFinite(configuredDeliveryAddedTaxRate) && configuredDeliveryAddedTaxRate >= 0 && Math.abs(expectedDeliveryAddedTaxRate - configuredDeliveryAddedTaxRate) > 0.0001) issues.push(`LOYVERSE_DELIVERY_ADDED_TAX_RATE must equal ${expectedDeliveryAddedTaxRate} for the delivery item`);
  }
  const storefrontCurrency = process.env.NEXT_PUBLIC_STORE_CURRENCY || "BSD";
  if (merchant.currency.code !== storefrontCurrency) issues.push(`Loyverse currency ${merchant.currency.code} does not match storefront currency ${storefrontCurrency}`);
  const authMode = process.env.LOYVERSE_WEBHOOK_AUTH_MODE || (process.env.LOYVERSE_CLIENT_SECRET ? "oauth" : "token");
  if (authMode === "oauth" && !process.env.LOYVERSE_CLIENT_SECRET) issues.push("LOYVERSE_CLIENT_SECRET is required for OAuth webhook signatures");
  if (authMode === "token" && !isStrongSecret(process.env.LOYVERSE_WEBHOOK_TOKEN)) issues.push("LOYVERSE_WEBHOOK_TOKEN must contain at least 32 characters and cannot be a development placeholder");
  let expectedWebhookUrl: string | null = null;
  try {
    expectedWebhookUrl = getLoyverseWebhookUrl();
    for (const type of ["inventory_levels.update", "items.update"] as LoyverseWebhookType[]) {
      if (!webhooks.some((webhook) => webhook.type === type && webhook.url === expectedWebhookUrl && webhook.status === "ENABLED")) {
        issues.push(`The ${type} webhook is not enabled at the expected callback URL`);
      }
    }
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "The webhook callback URL is invalid");
  }
  if ("error" in operations) issues.push(`Operational database check failed: ${operations.error}`);

  return {
    connected: issues.length === 0,
    expectedBusinessName,
    merchant: { id: merchant.id, businessName: merchant.business_name, country: merchant.country, currency: merchant.currency },
    configuredStore: configuredStore || null,
    configuredPaymentType: configuredPaymentType || null,
    configuredDeliveryVariant: deliveryVariant || null,
    configuredDeliveryTaxIds,
    configuredDeliveryAddedTaxRate,
    appliedTaxes,
    availableStores: stores,
    availablePaymentTypes: paymentTypes,
    webhookAuthMode: authMode,
    expectedWebhookUrl: expectedWebhookUrl ? sanitizeWebhook({ id: "expected", merchant_id: merchant.id, url: expectedWebhookUrl, type: "items.update", status: "ENABLED" }).url : null,
    webhooks: webhooks.map(sanitizeWebhook),
    operations,
    issues,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getDiagnostics());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Loyverse diagnostics failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = getLoyverseWebhookUrl();
    const existing = await listLoyverseWebhooks();
    const types: LoyverseWebhookType[] = ["inventory_levels.update", "items.update"];
    const registered = [];
    for (const type of types) {
      const current = existing.find((webhook) => webhook.type === type && webhook.url === url);
      registered.push(await upsertLoyverseWebhook({ id: current?.id, url, type, status: "ENABLED" }));
    }
    return NextResponse.json({ registered: registered.map(sanitizeWebhook), diagnostics: await getDiagnostics() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Loyverse webhook setup failed" }, { status: 500 });
  }
}
