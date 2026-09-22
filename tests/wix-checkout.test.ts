import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWixCatalogLineItems,
  buildWixCheckoutCallbacks,
  WixCatalogMappingError,
} from "@/lib/wix-checkout-contract";

test("Wix checkout uses the controlled product and variant mapping", () => {
  assert.deepEqual(buildWixCatalogLineItems([{
    sku: "005801d4-6ff6-47ef-b41e-ddc50856c838",
    quantity: 2,
  }]), [{
    catalogReference: {
      appId: "215238eb-22a5-4c36-9e7b-e7c08025e04e",
      catalogItemId: "04f6c31f-c25b-4f02-9aa9-63f6a499923d",
      options: { variantId: "16cde3f1-eb95-462d-9594-318b970b7988" },
    },
    quantity: 2,
  }]);
});

test("Wix checkout rejects unmapped products and unsafe quantities", () => {
  assert.throws(
    () => buildWixCatalogLineItems([{ sku: "not-mapped", quantity: 1 }]),
    WixCatalogMappingError,
  );
  assert.throws(
    () => buildWixCatalogLineItems([{ sku: "005801d4-6ff6-47ef-b41e-ddc50856c838", quantity: 0 }]),
    /Invalid Wix checkout quantity/,
  );
});

test("Wix checkout returns completed and abandoned flows to trusted storefront routes", () => {
  assert.deepEqual(buildWixCheckoutCallbacks("https://aurumprivee.com/"), {
    thankYouPageUrl: "https://aurumprivee.com/order/success?provider=wix",
    postFlowUrl: "https://aurumprivee.com/checkout?cancelled=1",
  });
  for (const origin of [
    "http://aurumprivee.com/",
    "https://aurumprivee.com/store",
    "https://aurumprivee.com/?next=https://example.com",
  ]) {
    assert.throws(() => buildWixCheckoutCallbacks(origin), /canonical HTTPS storefront origin/);
  }
});
