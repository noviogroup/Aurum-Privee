import assert from "node:assert/strict";
import test from "node:test";
import { activeCommerceProvider, legacyCommerceEnabled, legacyOperationsWritesEnabled, localOperationsDemoEnabled } from "@/lib/provider-operations";

test("Wix mode locks legacy staff-console writes", () => {
  assert.equal(activeCommerceProvider({ COMMERCE_PROVIDER: "wix" }), "wix");
  assert.equal(legacyOperationsWritesEnabled({ COMMERCE_PROVIDER: "wix" }), false);
  assert.equal(legacyOperationsWritesEnabled({ COMMERCE_PROVIDER: "legacy" }), true);
});

test("Wix mode disables the entire legacy commerce stack", () => {
  assert.equal(legacyCommerceEnabled({ COMMERCE_PROVIDER: "wix" }), false);
  assert.equal(legacyCommerceEnabled({ COMMERCE_PROVIDER: "legacy" }), true);
  assert.equal(legacyCommerceEnabled({ COMMERCE_PROVIDER: "unsupported" }), true);
});

test("operations demo records require an explicit local-only switch", () => {
  assert.equal(localOperationsDemoEnabled({ OPERATIONS_DEMO_MODE: "true", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }), true);
  assert.equal(localOperationsDemoEnabled({ OPERATIONS_DEMO_MODE: "true", NEXT_PUBLIC_SITE_URL: "https://aurumprivee.com" }), false);
  assert.equal(localOperationsDemoEnabled({ OPERATIONS_DEMO_MODE: "false", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }), false);
  assert.equal(localOperationsDemoEnabled({ OPERATIONS_DEMO_MODE: "true", NEXT_PUBLIC_SITE_URL: "not-a-url" }), false);
});
