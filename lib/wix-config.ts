import { isConfiguredSecret } from "@/lib/env";
import { wixCatalogMappingCount } from "@/lib/wix-catalog-map";

export type CommerceProvider = "legacy" | "wix";

export type WixEnvironment = {
  [key: string]: string | undefined;
  COMMERCE_PROVIDER?: string;
  NEXT_PUBLIC_CHECKOUT_ENABLED?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_WIX_CLIENT_ID?: string;
  WIX_API_KEY?: string;
  WIX_CLIENT_SECRET?: string;
  WIX_SITE_ID?: string;
  WIX_STOREFRONT_ORIGIN?: string;
  WIX_CATALOG_VERSION?: string;
  WIX_EXPECTED_SKU_COUNT?: string;
  WIX_CHECKOUT_ENABLED?: string;
};

export type WixReadiness = {
  provider: CommerceProvider;
  configured: boolean;
  checkoutReady: boolean;
  catalogVersion: "v3";
  expectedSkuCount: number;
  mappedSkuCount: number;
  checkoutEnabled: boolean;
  requirements: string[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function enabled(value: string | undefined) {
  return value === "true";
}

function validUuid(value: string | undefined) {
  return Boolean(value && uuidPattern.test(value.trim()));
}

function validHttpsOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function getCommerceProvider(value: string | undefined): CommerceProvider {
  return value === "wix" ? "wix" : "legacy";
}

export function parseExpectedSkuCount(value: string | undefined) {
  const parsed = Number(value || "733");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function evaluateWixReadiness(
  env: WixEnvironment = process.env,
  mappedSkuCount = wixCatalogMappingCount(),
): WixReadiness {
  const requirements: string[] = [];
  const provider = getCommerceProvider(env.COMMERCE_PROVIDER);
  const expectedSkuCount = parseExpectedSkuCount(env.WIX_EXPECTED_SKU_COUNT);
  const checkoutEnabled = enabled(env.NEXT_PUBLIC_CHECKOUT_ENABLED) && enabled(env.WIX_CHECKOUT_ENABLED);

  if (!isConfiguredSecret(env.NEXT_PUBLIC_WIX_CLIENT_ID)) requirements.push("Set the Wix Headless OAuth client ID in NEXT_PUBLIC_WIX_CLIENT_ID");
  if (!validUuid(env.WIX_SITE_ID)) requirements.push("Set the Aurum Privée Wix site ID in WIX_SITE_ID");
  if (!validHttpsOrigin(env.WIX_STOREFRONT_ORIGIN || env.NEXT_PUBLIC_SITE_URL)) {
    requirements.push("Set the canonical production HTTPS storefront origin in WIX_STOREFRONT_ORIGIN");
  }
  if ((env.WIX_CATALOG_VERSION || "v3").toLowerCase() !== "v3") requirements.push("Use Wix Stores Catalog V3");
  if (!expectedSkuCount) requirements.push("Set WIX_EXPECTED_SKU_COUNT to the approved positive SKU count");
  if (expectedSkuCount && mappedSkuCount !== expectedSkuCount) {
    requirements.push(`Map all ${expectedSkuCount} approved SKUs to Wix variants; currently mapped ${mappedSkuCount}`);
  }
  if (provider !== "wix") requirements.push("Set COMMERCE_PROVIDER=wix after checkout acceptance");
  if (!enabled(env.WIX_CHECKOUT_ENABLED)) requirements.push("Set WIX_CHECKOUT_ENABLED=true after checkout acceptance");
  if (!enabled(env.NEXT_PUBLIC_CHECKOUT_ENABLED)) requirements.push("Set NEXT_PUBLIC_CHECKOUT_ENABLED=true after checkout acceptance");

  const configured = requirements.length === 0;
  return {
    provider,
    configured,
    checkoutReady: configured && checkoutEnabled,
    catalogVersion: "v3",
    expectedSkuCount,
    mappedSkuCount,
    checkoutEnabled,
    requirements,
  };
}
