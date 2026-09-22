import assert from "node:assert/strict";
import test from "node:test";
import { evaluateWixReadiness, getCommerceProvider, parseExpectedSkuCount } from "../lib/wix-config";

function completeEnvironment() {
  return {
    COMMERCE_PROVIDER: "wix",
    NEXT_PUBLIC_CHECKOUT_ENABLED: "true",
    NEXT_PUBLIC_SITE_URL: "https://aurumprivee.com/",
    WIX_STOREFRONT_ORIGIN: "https://aurumprivee.com/",
    NEXT_PUBLIC_WIX_CLIENT_ID: "wix-headless-client-id",
    WIX_API_KEY: "wix-server-api-key",
    WIX_SITE_ID: "123e4567-e89b-42d3-a456-426614174000",
    WIX_CATALOG_VERSION: "v3",
    WIX_EXPECTED_SKU_COUNT: "733",
    WIX_CHECKOUT_ENABLED: "true",
  };
}

test("legacy remains the fail-safe commerce provider", () => {
  assert.equal(getCommerceProvider(undefined), "legacy");
  assert.equal(getCommerceProvider("unexpected"), "legacy");
  assert.equal(getCommerceProvider("wix"), "wix");
});

test("expected SKU count defaults to the approved catalog and rejects invalid values", () => {
  assert.equal(parseExpectedSkuCount(undefined), 733);
  assert.equal(parseExpectedSkuCount("707"), 707);
  assert.equal(parseExpectedSkuCount("0"), 0);
  assert.equal(parseExpectedSkuCount("not-a-number"), 0);
});

test("complete Wix cutover configuration is ready only with the full SKU map", () => {
  const result = evaluateWixReadiness(completeEnvironment(), 733);
  assert.equal(result.configured, true);
  assert.equal(result.checkoutReady, true);
  assert.equal(result.expectedSkuCount, 733);
  assert.equal(result.mappedSkuCount, 733);
  assert.deepEqual(result.requirements, []);

  const incomplete = evaluateWixReadiness(completeEnvironment(), 732);
  assert.equal(incomplete.configured, false);
  assert.equal(incomplete.checkoutReady, false);
  assert.equal(incomplete.requirements.some((item) => item.includes("currently mapped 732")), true);
});

test("checkout stays closed unless both launch controls and Wix are enabled", () => {
  const result = evaluateWixReadiness({
    ...completeEnvironment(),
    COMMERCE_PROVIDER: "legacy",
    WIX_CHECKOUT_ENABLED: "false",
    NEXT_PUBLIC_CHECKOUT_ENABLED: "false",
  }, 733);

  assert.equal(result.configured, false);
  assert.equal(result.checkoutReady, false);
  assert.equal(result.requirements.some((item) => item.includes("COMMERCE_PROVIDER=wix")), true);
  assert.equal(result.requirements.some((item) => item.includes("WIX_CHECKOUT_ENABLED=true")), true);
  assert.equal(result.requirements.some((item) => item.includes("NEXT_PUBLIC_CHECKOUT_ENABLED=true")), true);
});

test("checkout stays closed until returned Wix orders can be verified server-side", () => {
  const environment: Record<string, string | undefined> = completeEnvironment();
  delete environment.WIX_API_KEY;
  const result = evaluateWixReadiness(environment, 733);

  assert.equal(result.checkoutReady, false);
  assert.equal(result.requirements.some((item) => item.includes("returned orders can be verified")), true);
});
