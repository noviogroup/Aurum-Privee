import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { skipLegacyWorker } = require("../netlify/functions/provider-mode.cjs") as {
  skipLegacyWorker: (name: string) => { statusCode: number } | null;
};

test("legacy recovery workers become safe no-ops when Wix owns commerce", () => {
  const previousProvider = process.env.COMMERCE_PROVIDER;
  process.env.COMMERCE_PROVIDER = "wix";
  try {
    assert.deepEqual(skipLegacyWorker("Recovery worker"), { statusCode: 200 });
  } finally {
    if (previousProvider === undefined) delete process.env.COMMERCE_PROVIDER;
    else process.env.COMMERCE_PROVIDER = previousProvider;
  }
});

test("every scheduled legacy handler skips before reading legacy secrets in Wix mode", async () => {
  const previousProvider = process.env.COMMERCE_PROVIDER;
  process.env.COMMERCE_PROVIDER = "wix";
  try {
    for (const name of [
      "inventory-reservation-cleanup",
      "transactional-email-retry",
      "loyverse-order-retry",
      "loyverse-nightly-reconcile",
    ]) {
      const worker = require(`../netlify/functions/${name}.cjs`) as { handler: () => Promise<{ statusCode: number }> };
      assert.deepEqual(await worker.handler(), { statusCode: 200 });
    }
  } finally {
    if (previousProvider === undefined) delete process.env.COMMERCE_PROVIDER;
    else process.env.COMMERCE_PROVIDER = previousProvider;
  }
});

test("legacy recovery workers still execute after a provider rollback", () => {
  const previousProvider = process.env.COMMERCE_PROVIDER;
  process.env.COMMERCE_PROVIDER = "legacy";
  try {
    assert.equal(skipLegacyWorker("Recovery worker"), null);
  } finally {
    if (previousProvider === undefined) delete process.env.COMMERCE_PROVIDER;
    else process.env.COMMERCE_PROVIDER = previousProvider;
  }
});
